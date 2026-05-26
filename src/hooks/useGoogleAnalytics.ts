import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";
import { useUser } from "@stores/UserContext";

const MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
let isGAInitialized = false; // GA 초기화 상태 추적

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
    if (!isGAInitialized || !user?.booth_id) return;
    ReactGA.set({
      user_id: String(user.booth_id),
      booth_id: String(user.booth_id),
      booth_name: user.booth_name ?? "",
    });
    ReactGA.gtag("set", "user_properties", {
      booth_id: String(user.booth_id),
      booth_name: user.booth_name ?? "",
    });
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
  if (MEASUREMENT_ID && isGAInitialized) {
    ReactGA.event(eventName, parameters);
  }
};
