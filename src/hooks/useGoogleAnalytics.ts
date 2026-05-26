import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";
import { useUser } from "@stores/UserContext";

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
let isGAInitialized = false; // GA 초기화 상태 추적

// 로그인한 부스 정보를 GA에 등록 → 이후 모든 페이지뷰/이벤트가 부스별로 구분됨.
// 로그인 직후(useLogin)와 새로고침 재인증(DefaultLayout) 양쪽에서 호출된다.
export const setBoothForGA = (
  boothId?: number | string | null,
  boothName?: string | null
) => {
  if (!MEASUREMENT_ID || !isGAInitialized || !boothId) return;
  // 분석 설정 실패가 서비스 로직에 영향 주지 않도록 격리
  try {
    ReactGA.set({
      user_id: String(boothId),
      booth_id: String(boothId),
      booth_name: boothName ?? "",
    });
    ReactGA.gtag("set", "user_properties", {
      booth_id: String(boothId),
      booth_name: boothName ?? "",
    });
  } catch {
    // 무시: 분석은 부가 기능
  }
};

export const useGoogleAnalytics = () => {
  const location = useLocation();
  const { user } = useUser();

  // GA4 초기화 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    if (MEASUREMENT_ID) {
      // 로컬 환경에서는 GA 비활성화
      if (window.location.hostname === "localhost") {
        isGAInitialized = false; // 로컬에서는 초기화 상태를 false로 설정
        return;
      }

      ReactGA.initialize(MEASUREMENT_ID);
      isGAInitialized = true; // 초기화 완료 표시
    }
  }, []);

  // 부스 정보를 user property로 설정 → 모든 지표를 부스별로 구분
  useEffect(() => {
    setBoothForGA(user?.booth_id, user?.booth_name);
  }, [user?.booth_id, user?.booth_name]);

  // 페이지 변경 시마다 페이지뷰 전송
  useEffect(() => {
    // GA가 초기화되었을 때만 페이지뷰 전송
    if (MEASUREMENT_ID && isGAInitialized) {
      ReactGA.send({
        hitType: "pageview",
        page: location.pathname + location.search,
      });
    }
  }, [location]);
};

// 커스텀 이벤트 추적 함수
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, unknown>
) => {
  // GA가 초기화되었을 때만 이벤트 전송
  if (!MEASUREMENT_ID || !isGAInitialized) return;
  // 분석 전송 실패가 서비스 로직(상위 try/catch)에 영향 주지 않도록 격리
  try {
    ReactGA.event(eventName, parameters);
  } catch {
    // 무시: 분석은 부가 기능
  }
};
