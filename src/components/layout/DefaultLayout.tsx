import { Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "@components/header/Header";
import { useEffect } from "react";
import { refreshTokenApi } from "@apis/authApi";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";
import { useUser } from "@stores/UserContext";

const DefaultLayout = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await refreshTokenApi();
        if (!res.data) {
          navigate(ROUTE_CONSTANTS.LOGIN, { replace: true });
        } else {
          setUser({ username: res.data.username, booth_id: res.data.booth_id, booth_name: res.data.booth_name });
        }
      } catch {
        navigate(ROUTE_CONSTANTS.LOGIN, { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <Wrapper>
      <Header />
      <Outlet />
    </Wrapper>
  );
};

export default DefaultLayout;

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: calc(var(--vh, 1vh) * 100);
`;
