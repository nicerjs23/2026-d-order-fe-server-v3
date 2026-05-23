import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";

export const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

const isCsrfTokenEndpoint = (url?: string) =>
  url?.includes("/api/v3/django/auth/csrf-token/");

const isDjangoEndpoint = (url?: string) =>
  url?.includes("/api/v3/django/");

const isUnsafeMethod = (method?: string) => {
  const m = (method || "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS", "TRACE"].includes(m);
};

// 백엔드가 host-only 쿠키로 전환된 이후에도 과거 부모 도메인으로 박힌 잔재 쿠키가
// 브라우저에 남아 있으면 csrftoken이 두 개가 되어 CSRF 검증이 깨진다.
// 백엔드 clear_stale_domain_cookies helper가 99% 처리하지만 JS 측에서도 안전망으로 한 번 더.
const stripStaleCsrfCookies = () => {
  const past = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const domains = [
    ".dorder-api.shop",
    "dorder-api.shop",
    "dev.dorder-api.shop",
    ".dev.dorder-api.shop",
    "prod.dorder-api.shop",
    ".prod.dorder-api.shop",
  ];
  const names = ["csrftoken", "sessionid"];
  for (const d of domains) {
    for (const n of names) {
      document.cookie = `${n}=; ${past}; path=/; domain=${d}`;
    }
  }
};

let cachedCsrfToken: string | null = null;
let inflightCsrfFetch: Promise<string | null> | null = null;

const fetchCsrfToken = (): Promise<string | null> => {
  if (inflightCsrfFetch) return inflightCsrfFetch;
  stripStaleCsrfCookies();
  inflightCsrfFetch = instance
    .get("/api/v3/django/auth/csrf-token/")
    .then((res) => {
      const token = res.data?.csrfToken;
      cachedCsrfToken = typeof token === "string" ? token : null;
      return cachedCsrfToken;
    })
    .finally(() => {
      inflightCsrfFetch = null;
    });
  return inflightCsrfFetch;
};

// 401 refresh 동기화
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
};

// Request: unsafe 메서드일 때 CSRF 토큰 자동 주입
instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isUnsafeMethod(config.method) && !isCsrfTokenEndpoint(config.url) && isDjangoEndpoint(config.url)) {
      if (!cachedCsrfToken) {
        try {
          await fetchCsrfToken();
        } catch (e) {
          console.error("CSRF 토큰 사전 발급 실패", e);
        }
      }
      if (cachedCsrfToken) {
        config.headers["X-CSRFToken"] = cachedCsrfToken;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response: 403 CSRF 재시도 + 401 refresh
instance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    if (error.code === "ECONNABORTED") {
      window.location.href = "/error";
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _csrfRetry?: boolean;
    };

    // 403 → CSRF 토큰 재발급 후 1회 재시도 (host-only 전환 시점 잔재 충돌 대응)
    if (
      error.response?.status === 403 &&
      !originalRequest._csrfRetry &&
      !isCsrfTokenEndpoint(originalRequest.url) &&
      isDjangoEndpoint(originalRequest.url)
    ) {
      originalRequest._csrfRetry = true;
      try {
        cachedCsrfToken = null;
        const token = await fetchCsrfToken();
        if (token) {
          originalRequest.headers = originalRequest.headers ?? {};
          (originalRequest.headers as Record<string, string>)["X-CSRFToken"] =
            token;
        }
        return instance(originalRequest);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // refresh 자체가 401 → refresh token도 만료 → 로그인으로
      if (originalRequest.url?.includes("/auth/refresh")) {
        window.location.href = ROUTE_CONSTANTS.LOGIN;
        return Promise.reject(error);
      }

      // 이미 refresh 진행 중 → 큐에 추가하고 대기
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => instance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // instance 대신 순수 axios로 호출 (인터셉터 재진입 방지)
        const baseUrl = (import.meta.env.VITE_BASE_URL ?? "").replace(
          /\/+$/,
          ""
        );
        await axios.post(
          `${baseUrl}/api/v3/spring/auth/refresh`,
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        window.location.href = ROUTE_CONSTANTS.LOGIN;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
