import { createBrowserRouter } from "react-router-dom";
import DefaultLayout from "@components/layout/DefaultLayout";
import LoginLayout from "@components/layout/LoginLayout";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";
import LoginPage from "@pages/login/LoginPage";
import ServingPage from "@pages/serving/ServingPage";
import ErrorPage from "@pages/error/ErrorPage";
// import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: ROUTE_CONSTANTS.LOGIN,
    element: <LoginLayout />,
    errorElement: <ErrorPage />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: ROUTE_CONSTANTS.SERVING,
    element: <DefaultLayout />,
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
