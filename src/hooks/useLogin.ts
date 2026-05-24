import { useState } from "react";
import { loginApi, LoginRequest, LoginResponse } from "@apis/authApi";
import { useUser } from "@stores/UserContext";

interface UseLoginResult {
  login: (body: LoginRequest) => Promise<void>;
  loading: boolean;
  error: string | null;
  errorStatus: number | null;
  data: LoginResponse | null;
}

export function useLogin(): UseLoginResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [data, setData] = useState<LoginResponse | null>(null);
  const { setUser } = useUser();

  const login = async (body: LoginRequest) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    try {
      const res = await loginApi(body);
      setUser({ username: res.data.username, booth_id: res.data.booth_id });
      setData(res);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "알 수 없는 오류가 발생했습니다.";
      setError(errMsg);
      setErrorStatus(err?.response?.status ?? null);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error, errorStatus, data };
}
