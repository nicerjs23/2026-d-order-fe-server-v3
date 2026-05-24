import { instance } from "@services/instance";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  data: {
    username: string;
    booth_id: number;
    booth_name?: string;
  };
}

export const loginApi = async (body: LoginRequest): Promise<LoginResponse> => {
  const res = await instance.post("/api/v3/spring/auth", body);
  return res.data;
};

export const logoutApi = async (): Promise<{ message: string }> => {
  const res = await instance.delete("/api/v3/spring/auth");
  return res.data;
};

export interface RefreshResponse {
  message: string;
  data?: {
    username: string;
    booth_id: number;
  };
}

export const refreshTokenApi = async (): Promise<RefreshResponse> => {
  const res = await instance.post("/api/v3/spring/auth/refresh", {});
  return res.data;
};
