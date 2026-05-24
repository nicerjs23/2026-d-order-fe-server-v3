import styled from "styled-components";
import MainLogo from "@assets/icons/mainLogoV3.svg?react"; // SVG 컴포넌트 임포트

export const Wrapper = styled.main`
  display: flex;
  justify-content: center;
  box-sizing: border-box;
  padding: 5.5vh 0 4.4vh 0;
  width: 100%;
  min-height: calc(var(--vh, 1vh) * 100);
`;
export const Contents = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 87%;
`;
export const HeaderSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
export const Title = styled.div`
  ${({ theme }) => theme.fonts.Bold32};
  color: ${({ theme }) => theme.colors.Black02};
  margin-left: 5px;
`;

export const Logo = styled(MainLogo)`
  width: 55%;
  height: auto;
`;
export const FormSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const BtnMargin = styled.div`
  display: flex;
  margin-top: 16px;
`;

export const ErrorMessage = styled.p`
  ${({ theme }) => theme.fonts.Medium14};
  color: ${({ theme }) => theme.colors.Error};
  margin-top: -12px;
`;
