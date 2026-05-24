import * as S from "./StaffServe.styled";
import type { StaffServeUIItem } from "./StaffServe";

const parseServerDate = (dateString?: string): Date | null => {
  if (!dateString) return null;

  const trimmed = dateString.trim();
  if (!trimmed) return null;

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed}Z`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return null;

  return date;
};

const getOrderElapsedText = (dateString?: string): string => {
  const requestedDate = parseServerDate(dateString);

  if (!requestedDate) return "주문 시간 확인 불가";

  const diffMs = Date.now() - requestedDate.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMinutes < 1) return "방금 전";
  return `${diffMinutes}분 전`;
};

interface StaffServeItemProps {
  item: StaffServeUIItem;
  onAccept?: (item: StaffServeUIItem) => void;
}

const StaffServeItem = ({ item, onAccept }: StaffServeItemProps) => {
  return (
    <S.ItemWrapper>
      <S.LeftSection>
        <S.Table>
          <S.TableNumber $active={item.active}>{item.tableNumber}</S.TableNumber>
          <S.TableCall $active={item.active}>{item.menuName}</S.TableCall>
          <S.TableMeta $active={item.active}>{item.quantity}개</S.TableMeta>
        </S.Table>

        <S.TableWaiting $active={item.active}>
          {getOrderElapsedText(item.requestedAt)}
        </S.TableWaiting>
      </S.LeftSection>
      <S.StaffCallButton
        type="button"
        $active={item.active}
        disabled={!item.canCatch}
        onClick={() => {
          if (item.canCatch && onAccept) onAccept(item);
        }}
      >
        수락
      </S.StaffCallButton>
    </S.ItemWrapper>
  );
};

export default StaffServeItem;
