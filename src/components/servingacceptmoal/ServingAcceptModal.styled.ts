import styled from "styled-components";

export const Wrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
`;

export const BackGround = styled.div`
  background-color: ${({ theme }) => theme.colors.Black};
  opacity: 0.9;

  backdrop-filter: blur(10px);
  z-index: -1;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

export const TopSection = styled.div`
  width: 100%;
  height: fit-content;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;

  box-sizing: border-box;
`;

export const TopSectionCloseBtn = styled.img`
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  cursor: pointer;
`;

export const TopSectionRejectBtn = styled.button`
  ${({ theme }) => theme.fonts.Bold12};
  color: ${({ theme }) => theme.colors.Focused};
  border: none;
  outline: none;
  cursor: pointer;
`;

export const InformationSection = styled.div`
  width: 100%;
  height: fit-content;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1.75rem;
`;

export const InformationSectionTitle = styled.div`
  ${({ theme }) => theme.fonts.ExtraBold24};
  color: ${({ theme }) => theme.colors.Bg};
  text-align: center;
  white-space: pre-line;
  line-height: 1.5;
`;

export const InformationSectionImage = styled.img`
  width: 70%;
  height: 70%;
  object-fit: contain;
`;

export const InformationSectionContent = styled.div`
  ${({ theme }) => theme.fonts.Bold20};
  color: ${({ theme }) => theme.colors.Bg};
  text-align: center;
  line-height: 1.5;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;

  width: 100%;
  padding: 0 1.5rem;
  box-sizing: border-box;
`;

/** 테이블 번호 — 항상 한 줄 유지 (절대 깨지지 않게) */
export const InformationSectionPrimary = styled.span`
  white-space: nowrap;
  flex-shrink: 0;
`;

/** 메뉴명 + 개수 — 길어지면 단어 단위로 줄바꿈 */
export const InformationSectionSecondary = styled.span`
  min-width: 0;
  word-break: keep-all;
  overflow-wrap: anywhere;
`;

export const InformationSectionDiveider = styled.div`
  width: 0.125rem;
  height: 1rem;
  flex-shrink: 0;
  background-color: ${({ theme }) => theme.colors.Focused};
  display: flex;

  box-sizing: border-box;
`;

export const BottomAnimationSection = styled.div`
  width: 100%;
  padding: 0 2.25rem 3rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

export const SlideTrack = styled.div<{
  $isCompleted: boolean;
}>`
  --slide-progress: 0;
  position: relative;
  width: 100%;
  height: 4rem;
  border-radius: 2rem;
  background-color: ${({ $isCompleted, theme }) =>
    $isCompleted ? "none" : theme.colors.Bg02};
  overflow: hidden;
  user-select: none;
  touch-action: none;
`;

export const SlideTrackFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(270deg, #f5ebe5 15.87%, #ffbaa3 100%);
  transform: scaleX(var(--slide-progress, 0));
  transform-origin: left;
  transition: transform 0.12s ease-out;
  pointer-events: none;
`;

export const SlideTrackLabel = styled.span`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  ${({ theme }) => theme.fonts.Bold16};
  color: ${({ theme }) => theme.colors.Orange01};
  opacity: calc(1 - var(--slide-progress, 0));
  transition: opacity 0.1s ease-out;
  pointer-events: none;
  white-space: nowrap;
  will-change: opacity;
`;

export const SlideThumb = styled.div<{
  $isDragging?: boolean;
}>`
  position: absolute;
  left: calc(0.25rem + var(--slide-progress, 0) * (100% - 4rem));
  top: 50%;
  transform: translateY(-50%);
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: linear-gradient(270deg, #ff9877 0%, #ff6e3f 100%);
  cursor: grab;
  z-index: 2;
  transition: ${({ $isDragging }) =>
    $isDragging ? "none" : "left 0.12s ease-out"};
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: -6px 0 4px 0 rgba(255, 110, 63, 0.4);

  &:active {
    cursor: grabbing;
  }
`;

export const SlideThumbIcon = styled.img<{ $visible: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease;
  pointer-events: none;

  z-index: 2;
`;

export const SlideCompletedArrow = styled.img<{ $visible: boolean }>`
  width: 1rem;
  height: 1rem;
  object-fit: contain;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: opacity 0.15s ease;
  pointer-events: none;
`;

export const SlideCompletedWrap = styled.div<{ $visible: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  pointer-events: ${({ $visible }) => ($visible ? "auto" : "none")};
  transition: opacity 0.25s ease;
  z-index: 2;
`;

export const SlideCompletedCheck = styled.img`
  position: absolute;
  width: 101%;
  height: 100%;
  left: 0;
  top: 0;
  object-fit: cover;
`;

export const SlideCompletedText = styled.span`
  ${({ theme }) => theme.fonts.Bold16};
  color: ${({ theme }) => theme.colors.Bg};
  z-index: 2;
`;

/* ========== 클릭형 (serviceClick) ========== */
export const ClickTrack = styled.button<{ $checkBg?: string }>`
  position: relative;
  width: 100%;
  height: 4rem;
  border-radius: 2rem;
  border: none;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  background-image: ${({ $checkBg }) =>
    $checkBg ? `url(${$checkBg})` : "none"};
  background-size: cover;
  background-position: center;
  background-color: transparent;
`;

/** transition 시간과 TS 쪽 CLICK_COMPLETE_TRANSITION_MS 와 동일하게 */
const CLICK_EXIT_DURATION = "120ms";

export const ClickTrackCenter = styled.span<{ $isExiting?: boolean }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: ${({ $isExiting }) => ($isExiting ? 0 : 1)};
  transition: opacity ${CLICK_EXIT_DURATION} ease-out;
`;

export const ClickTrackLabel = styled.span<{ $completed: boolean }>`
  ${({ theme }) => theme.fonts.Bold16};
  color: ${({ $completed, theme }) =>
    $completed ? theme.colors.White : theme.colors.Orange01};
  background-color: ${({ $completed, theme }) =>
    $completed ? "none" : theme.colors.Bg02};
  width: 100%;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2rem;
`;

export const ClickTrackLeft = styled.span`
  width: 3rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.5rem;
`;

export const ClickTrackStar = styled.span`
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
`;

export const ClickTrackIconWrap = styled.span<{ $isExiting?: boolean }>`
  flex-shrink: 0;
  width: 4rem;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  opacity: ${({ $isExiting }) => ($isExiting ? 0 : 1)};
  transition: opacity ${CLICK_EXIT_DURATION} ease-out;
`;

export const ClickTrackIcon = styled.img<{ $visible: boolean }>`
  padding: 0 0 0 0.5rem;
  width: ${({ $visible }) => ($visible ? "3.5rem" : "1.25rem")};
  height: ${({ $visible }) => ($visible ? "3.5rem" : "1.25rem")};
  object-fit: contain;
`;
