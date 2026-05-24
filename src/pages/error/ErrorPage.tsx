import styled, { keyframes } from "styled-components";
import { IMAGE_CONSTANTS } from "@constants/ImageConstants";
import { useNavigate } from "react-router-dom";
import { ROUTE_CONSTANTS } from "@constants/RouteConstants";

const ErrorPage = () => {
  const navigate = useNavigate();

  return (
    <Wrapper>
      <ContentsWrapper>
        <Character src={IMAGE_CONSTANTS.sadKokkiri} alt="캐릭터" />
        <TextWrapper>
          <ErrorCode>404</ErrorCode>
          <ErrorTitle>페이지를 찾을 수 없어요.</ErrorTitle>
          <ErrorSubTitle>요청하신 페이지가 존재하지 않아요!</ErrorSubTitle>
        </TextWrapper>
        <HomeButton onClick={() => navigate(ROUTE_CONSTANTS.LOGIN)}>
          홈으로 돌아가기
        </HomeButton>
      </ContentsWrapper>
    </Wrapper>
  );
};

export default ErrorPage;

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: calc(var(--vh, 1vh) * 100);
  background-color: ${({ theme }) => theme.colors.Orange00};
  padding-bottom: 100px;
  box-sizing: border-box;
`;

const ContentsWrapper = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 38px;
`;

const Character = styled.img`
  display: flex;
  width: 30%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  animation: ${float} 2.5s ease-in-out infinite;
`;

const TextWrapper = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 14px;
`;

const ErrorCode = styled.div`
  display: flex;
  color: ${({ theme }) => theme.colors.Orange01};
  ${({ theme }) => theme.fonts.Bold18};
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 4px;
`;

const ErrorTitle = styled.div`
  display: flex;
  color: ${({ theme }) => theme.colors.Orange01};
  ${({ theme }) => theme.fonts.Bold18};
`;

const ErrorSubTitle = styled.div`
  display: flex;
  color: #8a8a8a;
  ${({ theme }) => theme.fonts.SemiBold14};
`;

const HomeButton = styled.button`
  padding: 14px 32px;
  background-color: ${({ theme }) => theme.colors.Orange01};
  color: #ffffff;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  ${({ theme }) => theme.fonts.SemiBold14};
`;
