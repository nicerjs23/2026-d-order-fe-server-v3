import { memo } from "react";
import * as S from "./SelectTap.styled";

import { IMAGE_CONSTANTS } from "@constants/ImageConstants";

interface SelectTapProps {
  activeTab: "StaffCall" | "StaffServe";
  onTabChange: (tab: "StaffCall" | "StaffServe") => void;
  /** 상단 탭에 표시할 건수 (서빙요청) */
  staffServeCount?: number | null;
  /** 상단 탭에 표시할 건수 (직원 호출, WS total) */
  staffCallCount?: number | null;
}

const SelectTapInner = ({
  activeTab,
  onTabChange,
  staffServeCount,
  staffCallCount,
}: SelectTapProps) => {
  const handleTabClick = (tab: "StaffCall" | "StaffServe") => {
    onTabChange(tab);
  };

  return (
    <S.Wrapper>
      <S.Buttons>
        <S.Button
          $active={activeTab === "StaffCall"}
          onClick={() => handleTabClick("StaffCall")}
        >
          <S.ButtonIcon
            src={
              activeTab === "StaffCall"
                ? IMAGE_CONSTANTS.TabSection.StaffCall_activated
                : IMAGE_CONSTANTS.TabSection.StaffCall_unactivated
            }
          />
          <S.ButtonText $active={activeTab === "StaffCall"}>
            {"직원 호출 ("}
            {staffCallCount == null ? (
              <S.LoadingCount aria-label="직원 호출 수 불러오는 중">
                -
              </S.LoadingCount>
            ) : (
              staffCallCount
            )}
            {")"}
          </S.ButtonText>
        </S.Button>
        <S.Button
          $active={activeTab === "StaffServe"}
          onClick={() => handleTabClick("StaffServe")}
        >
          <S.ButtonIcon
            src={
              activeTab === "StaffServe"
                ? IMAGE_CONSTANTS.TabSection.StaffServe_activated
                : IMAGE_CONSTANTS.TabSection.StaffServe_unactivated
            }
          />
          <S.ButtonText $active={activeTab === "StaffServe"}>
            {"서빙 요청 ("}
            {staffServeCount == null ? (
              <S.LoadingCount aria-label="서빙 요청 수 불러오는 중">
                -
              </S.LoadingCount>
            ) : (
              staffServeCount
            )}
            {")"}
          </S.ButtonText>
        </S.Button>
      </S.Buttons>
    </S.Wrapper>
  );
};

const SelectTap = memo(SelectTapInner);
export default SelectTap;
