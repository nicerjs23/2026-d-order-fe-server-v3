import styled from "styled-components";

export const Wrapper = styled.div`
  width: 100%;
  height: fit-content;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
  padding: 1rem;
`;
export const Buttons = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.colors.Gray01};
  height: fit-content;
  display: flex;
  padding: 0.2rem;
  gap: 0.2rem;
  box-sizing: border-box;
  border-radius: 0.75rem;
  justify-content: center;
  align-items: center;
`;

export const Button = styled.button<{ $active: boolean }>`
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.White : theme.colors.Gray01};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.Orange01 : theme.colors.Focused};
  border-radius: 0.75rem;
  width: 100%;
  height: fit-content;
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  padding: 1rem 2rem;
  cursor: pointer;
`;

export const ButtonText = styled.span<{ $active: boolean }>`
  ${({ theme }) => theme.fonts.Bold16};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.Orange01 : theme.colors.Focused};
`;

export const LoadingCount = styled.span`
  display: inline-block;
  min-width: 0.5rem;
  animation: countPulse 1.1s ease-in-out infinite;

  @keyframes countPulse {
    0%,
    100% {
      opacity: 0.35;
    }

    50% {
      opacity: 1;
    }
  }
`;

export const ButtonIcon = styled.img`
  color: ${({ theme }) => theme.colors.Focused};
  width: 20px;
  height: 20px;
`;
