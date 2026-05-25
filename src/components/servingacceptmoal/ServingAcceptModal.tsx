import * as S from "./ServingAcceptModal.styled";
import { memo, useEffect, useMemo, useRef, useState, useCallback } from "react";

import { IMAGE_CONSTANTS } from "@constants/ImageConstants";
import {
  type ServingAcceptModalVariant,
  resolveServingAcceptModalConfig,
  servingAcceptVariantForCallType,
} from "./types";

const SLIDE_COMPLETE_THRESHOLD = 0.88;
/** 클릭형: transition이 끝난 뒤에 완료 내용이 나오도록 하는 시간(ms). CSS transition과 동일하게 맞출 것 */
const CLICK_COMPLETE_TRANSITION_MS = 220;

type HeaderProps = {
  onLeft: () => void;
  onCancelOrder?: () => void;
  showCancelOrder: boolean;
};

const ModalHeader = memo(
  ({ onLeft, onCancelOrder, showCancelOrder }: HeaderProps) => {
    return (
      <S.TopSection>
        <S.TopSectionCloseBtn
          src={IMAGE_CONSTANTS.ServingAcceptModal.CloseBtn}
          alt="수락 취소 / 뒤로가기"
          onClick={onLeft}
          role="button"
        />
        {showCancelOrder && onCancelOrder && (
          <S.TopSectionRejectBtn type="button" onClick={onCancelOrder}>
            주문 취소
          </S.TopSectionRejectBtn>
        )}
      </S.TopSection>
    );
  }
);
ModalHeader.displayName = "ModalHeader";

type InfoProps = {
  titleLines: string[];
  tableNumberText: string;
  extraContentText?: string;
};

const ModalInfo = memo(
  ({ titleLines, tableNumberText, extraContentText }: InfoProps) => {
    return (
      <S.InformationSection>
        <S.InformationSectionTitle>
          {titleLines.map((line, i) => (
            <span key={i}>
              {line}
              {i < titleLines.length - 1 && <br />}
            </span>
          ))}
        </S.InformationSectionTitle>
        <S.InformationSectionImage
          src={IMAGE_CONSTANTS.ServingAcceptModal.RejectBtn}
        />
        <S.InformationSectionContent>
          <S.InformationSectionPrimary>
            {tableNumberText}
          </S.InformationSectionPrimary>
          {extraContentText && (
            <>
              <S.InformationSectionDiveider />
              <S.InformationSectionSecondary>
                {extraContentText}
              </S.InformationSectionSecondary>
            </>
          )}
        </S.InformationSectionContent>
      </S.InformationSection>
    );
  }
);
ModalInfo.displayName = "ModalInfo";

type SlideControlProps = {
  slideLabel: string;
  completedText: string;
  onComplete?: () => void;
};

const SlideControl = memo(
  ({ slideLabel, completedText, onComplete }: SlideControlProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [slideProgress, setSlideProgress] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);

    /* 손가락 위치 = 공 중심이 되도록 */
    const getFromClientX = useCallback((clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const remPx =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const startPx = (0.25 + 1.75) * remPx;
      const endPx = rect.width - (0.25 + 1.75) * remPx;
      const travel = endPx - startPx;
      if (travel <= 0) return 0;
      const x = clientX - rect.left - startPx;
      const progress = Math.max(0, Math.min(1, x / travel));
      return progress;
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (isCompleted) return;
        isDraggingRef.current = true;
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      },
      [isCompleted]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isDraggingRef.current || isCompleted) return;
        setSlideProgress(getFromClientX(e.clientX));
      },
      [isCompleted, getFromClientX]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent) => {
        if (!isDraggingRef.current) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        isDraggingRef.current = false;
        setIsDragging(false);
        const progress = getFromClientX(e.clientX);
        if (progress >= SLIDE_COMPLETE_THRESHOLD) {
          setSlideProgress(1);
          setIsCompleted(true);
          onComplete?.();
        } else {
          setSlideProgress(0);
        }
      },
      [getFromClientX, onComplete]
    );

    return (
      <S.SlideTrack
        $isCompleted={isCompleted}
        ref={trackRef}
        style={
          {
            ["--slide-progress" as any]: isCompleted ? 1 : slideProgress,
          } as React.CSSProperties
        }
      >
        <S.SlideTrackFill />
        <S.SlideTrackLabel>{slideLabel}</S.SlideTrackLabel>
        <S.SlideThumb
          $isDragging={isDragging}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {isCompleted ? (
            <S.SlideThumbIcon
              src={IMAGE_CONSTANTS.ServingAcceptModal.CheckIcon}
              alt="완료"
              $visible
            />
          ) : (
            <S.SlideCompletedArrow
              src={IMAGE_CONSTANTS.ServingAcceptModal.RightArrow}
              $visible={!isDragging}
            />
          )}
        </S.SlideThumb>

        <S.SlideCompletedWrap $visible={isCompleted}>
          <S.SlideCompletedCheck
            src={IMAGE_CONSTANTS.ServingAcceptModal.Check}
            alt="완료"
          />
          <S.SlideCompletedText>{completedText}</S.SlideCompletedText>
        </S.SlideCompletedWrap>
      </S.SlideTrack>
    );
  }
);
SlideControl.displayName = "SlideControl";

type ClickControlProps = {
  clickLabel: string;
  completedText: string;
  clickCompletedText?: string;
  onComplete?: () => void;
};

const ClickControl = memo(
  ({
    clickLabel,
    completedText,
    clickCompletedText,
    onComplete,
  }: ClickControlProps) => {
    const [isCompleted, setIsCompleted] = useState(false);
    const [isClickExiting, setIsClickExiting] = useState(false);
    const clickCompleteTimeoutRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

    const handleClickComplete = useCallback(() => {
      if (isCompleted || isClickExiting) return;
      setIsClickExiting(true);
      clickCompleteTimeoutRef.current = setTimeout(() => {
        clickCompleteTimeoutRef.current = null;
        setIsCompleted(true);
        setIsClickExiting(false);
        onComplete?.();
      }, CLICK_COMPLETE_TRANSITION_MS);
    }, [isCompleted, isClickExiting, onComplete]);

    useEffect(() => {
      return () => {
        if (clickCompleteTimeoutRef.current)
          clearTimeout(clickCompleteTimeoutRef.current);
      };
    }, []);

    return (
      <S.ClickTrack
        type="button"
        $checkBg={IMAGE_CONSTANTS.ServingAcceptModal.Check}
        onClick={handleClickComplete}
      >
        {isCompleted && <S.ClickTrackLeft></S.ClickTrackLeft>}
        <S.ClickTrackCenter $isExiting={isClickExiting}>
          <S.ClickTrackLabel $completed={isCompleted}>
            {isCompleted ? (clickCompletedText ?? completedText) : clickLabel}
          </S.ClickTrackLabel>
        </S.ClickTrackCenter>
        <S.ClickTrackIconWrap $isExiting={isClickExiting}>
          <S.ClickTrackIcon
            src={
              isCompleted
                ? IMAGE_CONSTANTS.ServingAcceptModal.CheckIcon
                : IMAGE_CONSTANTS.ServingAcceptModal.CheckIcon2
            }
            $visible={isCompleted}
            alt={isCompleted ? "확인" : ""}
          />
        </S.ClickTrackIconWrap>
      </S.ClickTrack>
    );
  }
);
ClickControl.displayName = "ClickControl";

export interface ServingAcceptModalProps {
  variant?: ServingAcceptModalVariant;
  /**
   * API `call_type` (예: PAYMENT_CONFIRM, TRANSFER_CONFIRM 등).
   * 있으면 variant·하단 문구가 callType에 맞게 조정됩니다.
   */
  callType?: string;
  /** 밀어서 서비스 완료(또는 결제 확인) 슬라이드가 끝까지 완료된 시점 */
  onSlideComplete?: () => void;
  /** 클릭형(serviceClick)에서 서비스 완료가 확정된 시점 */
  onClickComplete?: () => void;
  /** 좌상단: 호출/서빙 수락 취소(서버 cancel). 없으면 onClose만 동작 */
  onCancelAccept?: () => void | Promise<void>;
  /** 좌상단 닫기(뒤로) — onCancelAccept가 없을 때만 사용 */
  onClose?: () => void;
  /** 우상단 주문 취소 */
  onCancelOrder?: () => void;
  /** 서빙/호출 대상 정보 표시용 (ex: "T4") */
  tableNumberText?: string;
  /** 하단 추가 텍스트 (ex: 금액 등, 없으면 생략) */
  extraContentText?: string;
}

const ServingAcceptModal = ({
  variant = "serviceSlide",
  callType,
  onSlideComplete,
  onClickComplete,
  onCancelAccept,
  onClose,
  onCancelOrder,
  tableNumberText = "테이블",
  extraContentText,
}: ServingAcceptModalProps) => {
  const isStaffCall = useMemo(() => {
    const t = String(callType ?? "")
      .trim()
      .toUpperCase();
    return t === "STAFF_CALL";
  }, [callType]);

  const effectiveVariant = callType?.trim()
    ? servingAcceptVariantForCallType(callType)
    : variant;
  const config = resolveServingAcceptModalConfig(effectiveVariant, callType);
  const isSlide =
    effectiveVariant === "payment" || effectiveVariant === "serviceSlide";
  const isClick = effectiveVariant === "serviceClick";

  const titleLines = useMemo(() => config.title.split("\n"), [config.title]);

  const handleLeft = useCallback(() => {
    if (onCancelAccept) void onCancelAccept();
    else onClose?.();
  }, [onCancelAccept, onClose]);

  return (
    <S.Wrapper>
      <S.BackGround />
      <ModalHeader
        onLeft={handleLeft}
        onCancelOrder={onCancelOrder}
        showCancelOrder={!isStaffCall}
      />
      <ModalInfo
        titleLines={titleLines}
        tableNumberText={tableNumberText}
        extraContentText={extraContentText}
      />

      <S.BottomAnimationSection>
        {isSlide && (
          <SlideControl
            slideLabel={config.slideLabel ?? ""}
            completedText={config.completedText}
            onComplete={onSlideComplete}
          />
        )}

        {isClick && (
          <ClickControl
            clickLabel={config.clickLabel ?? ""}
            clickCompletedText={config.clickCompletedText}
            completedText={config.completedText}
            onComplete={onClickComplete}
          />
        )}
      </S.BottomAnimationSection>
    </S.Wrapper>
  );
};

const MemoServingAcceptModal = memo(ServingAcceptModal);
MemoServingAcceptModal.displayName = "ServingAcceptModal";

export default MemoServingAcceptModal;
