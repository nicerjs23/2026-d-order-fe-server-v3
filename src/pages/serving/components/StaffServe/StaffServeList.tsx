import * as S from "./StaffServe.styled";
import { IMAGE_CONSTANTS } from "@constants/ImageConstants";
import StaffServeItem from "./StaffServeItem";
import type { StaffServeUIItem } from "./StaffServe";

interface StaffServeListProps {
  list: StaffServeUIItem[];
  onAcceptServe?: (item: StaffServeUIItem) => void;
}

const StaffServeList = ({ list, onAcceptServe }: StaffServeListProps) => {
  const isEmpty = list.length === 0;
  return (
    <S.ListContainer $empty={isEmpty}>
      {list.map((item) => (
        <StaffServeItem
          key={item.id}
          item={item}
          onAccept={onAcceptServe}
        />
      ))}
      {isEmpty && (
        <S.NoDataWrapper>
          <S.NoDataImage src={IMAGE_CONSTANTS.sadKokkiri} />
          <S.NoDataText>
            요청이 없어요...
            <br />
            이참에 쉬어볼까요?
          </S.NoDataText>
        </S.NoDataWrapper>
      )}
    </S.ListContainer>
  );
};

export default StaffServeList;
