import styled from "styled-components";
import { IMAGE_CONSTANTS } from "@constants/ImageConstants";
import { logoutApi } from "@apis/authApi";
import { useNavigate } from "react-router-dom";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";
import { useUser } from "@stores/UserContext";

const Header = () => {
  const { user } = useUser();
  const boothName = user?.booth_name || user?.username || "부스이름";
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
      navigate(ROUTE_CONSTANTS.LOGIN);
    } catch (e) {
      // 에러 처리 필요시 추가
      alert("로그아웃에 실패했습니다.");
    }
  };

  return (
    <Wrapper>
      <Title>{boothName}</Title>
      <ExitBtn src={IMAGE_CONSTANTS.ExitBtn} onClick={handleLogout} />
    </Wrapper>
  );
};

export default Header;

export const Wrapper = styled.div`
  position: sticky;
  top: 0;
  z-index: 10;

  width: 100%;
  height: fit-content;
  background-color: ${({ theme }) => theme.colors.White};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  box-sizing: border-box;
  border-bottom: 1px solid ${({ theme }) => theme.colors.BorderGray};
`;

export const Title = styled.h1`
  ${({ theme }) => theme.fonts.Bold18};
  color: ${({ theme }) => theme.colors.Black02};
`;

export const ExitBtn = styled.img`
  width: 20px;
  height: 20px;

  cursor: pointer;
`;
