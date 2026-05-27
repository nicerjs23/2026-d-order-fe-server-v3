import styled, { keyframes } from "styled-components";

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`;

export const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: flex-end;
`;

export const SheetContainer = styled.div`
  width: 100%;
  max-width: 500px;
  background-color: ${({ theme }) => theme.colors?.White || "#FFFFFF"};
  border-radius: 1.5rem 1.5rem 0 0;
  padding: 0.5rem 0.75rem 5rem;
  box-sizing: border-box;
  animation: ${slideUp} 0.3s ease-out;
  display: flex;
  flex-direction: column;
`;

export const HandleBar = styled.div`
  width: 2.5rem;
  height: 0.25rem;
  background-color: #e0e0e0;
  border-radius: 2px;
  margin: 0 auto 1.625rem auto;
`;

// export const Title = styled.h2`
//   font: ${({ theme }) => theme.fonts?.Bold20 || "700 20px sans-serif"};
//   margin: 0 0 1.5rem 0;
// `;

export const InputBox = styled.div`
  width: 100%;
  height: 3.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(192, 192, 192, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.Bg};
  margin-bottom: 2rem;
`;

export const Placeholder = styled.span`
  ${({ theme }) => theme.fonts.Bold18};
  color: ${({ theme }) => theme.colors.Focused};
`;

export const InputText = styled.span`
  ${({ theme }) => theme.fonts.Bold24};
  color: ${({ theme }) => theme.colors.Black};
`;

export const KeypadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  margin-bottom: 1.25rem;
`;

export const KeyButton = styled.button`
  aspect-ratio: 2 / 1;
  border-radius: 0.75rem;
  background-color: #f8f8f8;
  border: none;
  ${({ theme }) => theme.fonts.Bold24};
  color: #a0a0a0;
  box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.05);

  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  &:active {
    background-color: #efefef;
  }

  img {
    width: 3.125rem;
    height: auto;
  }
`;

export const SubmitButton = styled.button<{ $active: boolean }>`
  width: 100%;
  height: 3.5rem;
  border-radius: 0.75rem;
  background-color: ${({ theme, $active }) =>
    $active ? theme.colors.Orange01 : theme.colors.Black02};
  color: ${({ theme }) => theme.colors?.White || "#FFFFFF"};
  ${({ theme }) => theme.fonts.Bold16};
  border: none;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;
