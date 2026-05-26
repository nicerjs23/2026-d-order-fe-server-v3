import { createBrowserRouter } from "react-router-dom";
import DefaultLayout from "@components/layout/DefaultLayout";
import LoginLayout from "@components/layout/LoginLayout";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";
import LoginPage from "@pages/login/LoginPage";
import ServingPage from "@pages/serving/ServingPage";
import ErrorPage from "@pages/error/ErrorPage";
// GA훅 추가
import { useGoogleAnalytics } from "@hooks/useGoogleAnalytics";
// import ProtectedRoute from "./ProtectedRoute";

// GA 추적을 위한 래퍼 컴포넌트
const LayoutWithAnalytics = ({ children }: { children: React.ReactNode }) => {
  useGoogleAnalytics(); // Router 컨텍스트 내부에서 사용
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: ROUTE_CONSTANTS.LOGIN,
    element: (
      <LayoutWithAnalytics>
        <LoginLayout />
      </LayoutWithAnalytics>
    ),
    errorElement: <ErrorPage />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: ROUTE_CONSTANTS.SERVING,
    element: (
      <LayoutWithAnalytics>
        <DefaultLayout />
      </LayoutWithAnalytics>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <ServingPage />,
      },
    ],
  },
  {
    path: "*",
    element: <ErrorPage />,
  },
]);

export default router;
