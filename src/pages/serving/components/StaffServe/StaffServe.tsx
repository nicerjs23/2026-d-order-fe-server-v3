import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import * as S from "./StaffServe.styled";
import components from "../index";
import StaffServeList from "./StaffServeList";
import {
  getServingCalls,
  getServingFilterOptions,
  isVisibleServingFilterMenu,
  ServingFilterMenuOption,
  ServingTaskResponse,
} from "../../apis/servingApi";
import { useServingWebSocket, ServingWsPayload } from "../../hooks/useServingWebSocket";

export interface StaffServeUIItem {
  id: number;
  orderItemId: number;
  tableNumber: string;
  rawTableNumber: number | null;
  menuName: string;
  quantity: number;
  requestedAt?: string;
  active: boolean;
}

interface StaffServeProps {
  /** 비활성 탭에서는 WS 연결 종료만 하고 패널은 유지할 때 false */
  servingWsEnabled?: boolean;
  onUpdateServeCount?: (count: number) => void;
  onAcceptServe?: (taskId: number, tableNumber: string, orderItemId: number) => void;
}

const getMenuFilterLabel = (selectedMenus: string[]): string | undefined => {
  if (selectedMenus.length === 0) return undefined;
  if (selectedMenus.length === 1) return selectedMenus[0];
  return `${selectedMenus[0]} 외 ${selectedMenus.length - 1}건`;
};

const getRequestedAtTime = (requestedAt?: string) => {
  if (!requestedAt) return Number.MAX_SAFE_INTEGER;

  const time = new Date(requestedAt).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
};

const sortStaffServeList = (list: StaffServeUIItem[]) => {
  return [...list].sort((a, b) => {
    const requestedAtDiff = getRequestedAtTime(a.requestedAt) - getRequestedAtTime(b.requestedAt);
    if (requestedAtDiff !== 0) return requestedAtDiff;
    return a.id - b.id;
  });
};

const StaffServe = ({
  servingWsEnabled = true,
  onUpdateServeCount,
  onAcceptServe,
}: StaffServeProps) => {
  const [isMenuFilterOpen, setIsMenuFilterOpen] = useState(false);
  const [isTableFilterOpen, setIsTableFilterOpen] = useState(false);

  const [selectedMenuNames, setSelectedMenuNames] = useState<string[]>([]);
  const [selectedTableRanges, setSelectedTableRanges] = useState<{ start: string; end: string }[]>([]);

  const [menuList, setMenuList] = useState<ServingFilterMenuOption[]>([]);
  const [tableOptions, setTableOptions] = useState<number[]>([]);
  const [staffServeList, setStaffServeList] = useState<StaffServeUIItem[]>([]);

  const formatTableNumber = (tableNumber: number | null | undefined) => {
    if (typeof tableNumber === "number" && Number.isFinite(tableNumber)) return `T${tableNumber}`;
    return "T-";
  };

  const mapToUIModel = useCallback((task: ServingTaskResponse): StaffServeUIItem => {
    return {
      id: task.taskId,
      orderItemId: task.orderItemId,
      tableNumber: formatTableNumber(task.tableNumber),
      rawTableNumber: task.tableNumber ?? null,
      menuName: task.menuName ?? "메뉴 정보 없음",
      quantity: typeof task.quantity === "number" && task.quantity > 0 ? task.quantity : 1,
      requestedAt: task.requestedAt,
      active: task.status === "SERVE_REQUESTED",
    };
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [servingRes, filterOptions] = await Promise.all([getServingCalls(), getServingFilterOptions()]);
        setMenuList((filterOptions.data.menus ?? []).filter(isVisibleServingFilterMenu));
        setTableOptions(filterOptions.data.tables ?? []);

        if (Array.isArray(servingRes)) {
          setStaffServeList(sortStaffServeList(servingRes.map(mapToUIModel)));
        }
      } catch (error) {
        console.error("데이터 초기화 실패:", error);
      }
    };

    fetchInitialData();
  }, [mapToUIModel]);

  /** 탭 이탈 시 WS만 끄고 패널을 유지하므로, 다시 활성화될 때 목록만 동기화 */
  const prevServingWsEnabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    const prev = prevServingWsEnabledRef.current;
    prevServingWsEnabledRef.current = servingWsEnabled;
    if (!servingWsEnabled) return;
    if (prev !== false) return;

    let cancelled = false;
    void (async () => {
      try {
        const servingRes = await getServingCalls();
        if (cancelled || !Array.isArray(servingRes)) return;
        setStaffServeList(sortStaffServeList(servingRes.map(mapToUIModel)));
      } catch (error) {
        console.error("서빙 목록 재동기화 실패:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [servingWsEnabled, mapToUIModel]);

  useServingWebSocket({
    enabled: servingWsEnabled,
    onMessage: (payload: ServingWsPayload) => {
      setStaffServeList((prevList) => {
        switch (payload.type) {
          case "NEW_CALL": {
            const formattedData = mapToUIModel(payload.data);
            const alreadyExists = prevList.some(
              (item) => item.id === formattedData.id || item.orderItemId === formattedData.orderItemId
            );
            if (alreadyExists) return prevList;
            return sortStaffServeList([...prevList, formattedData]);
          }
          case "REMOVE_CALL": {
            const { orderItemId, tableNumber } = payload.data;
            return prevList.filter((item) => {
              if (typeof orderItemId === "number") return item.orderItemId !== orderItemId;
              if (typeof tableNumber === "number") return item.rawTableNumber !== tableNumber;
              return true;
            });
          }
          case "CATCH_CALL": {
            const formattedData = mapToUIModel(payload.data);
            return sortStaffServeList(
              prevList.map((item) => (item.id === formattedData.id ? formattedData : item))
            );
          }
          case "COMPLETE_CALL":
            return prevList.filter((item) => item.id !== payload.data.taskId);
          case "CANCEL_CALL": {
            const formattedData = mapToUIModel(payload.data);
            const isExist = prevList.some((item) => item.id === formattedData.id);
            if (!isExist) return sortStaffServeList([...prevList, formattedData]);
            return sortStaffServeList(
              prevList.map((item) => (item.id === formattedData.id ? formattedData : item))
            );
          }
          default:
            return prevList;
        }
      });
    },
  });

  const filteredStaffServeList = useMemo(() => {
    return staffServeList.filter((item) => {
      const matchesMenu =
        selectedMenuNames.length === 0 || selectedMenuNames.includes(item.menuName);

      const matchesTable =
        selectedTableRanges.length === 0 ||
        (typeof item.rawTableNumber === "number" &&
          selectedTableRanges.some((range) => {
            const start = Number(range.start);
            const end = Number(range.end);
            if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
            const min = Math.min(start, end);
            const max = Math.max(start, end);
            return item.rawTableNumber! >= min && item.rawTableNumber! <= max;
          }));

      return matchesMenu && matchesTable;
    });
  }, [staffServeList, selectedMenuNames, selectedTableRanges]);

  const activeStaffServeCount = useMemo(() => {
    return staffServeList.filter((item) => item.active).length;
  }, [staffServeList]);

  useEffect(() => {
    onUpdateServeCount?.(activeStaffServeCount);
  }, [activeStaffServeCount, onUpdateServeCount]);

  const selectedMenuName = getMenuFilterLabel(selectedMenuNames);

  return (
    <S.ServeColumn>
      <components.FilterBtn
        onMenuClick={() => setIsMenuFilterOpen(true)}
        onTableClick={() => setIsTableFilterOpen(true)}
        selectedMenuName={selectedMenuName}
        selectedTableRanges={selectedTableRanges}
        onMenuClear={(e) => {
          e.stopPropagation();
          setSelectedMenuNames([]);
        }}
        onTableClear={(e) => {
          e.stopPropagation();
          setSelectedTableRanges([]);
        }}
      />

      <StaffServeList list={filteredStaffServeList} onAcceptServe={onAcceptServe} />

      {isMenuFilterOpen && (
        <components.MenuFilterSheet
          menuOptions={menuList}
          initialSelectedMenus={selectedMenuNames}
          onApply={(names) => setSelectedMenuNames(names)}
          onClose={() => setIsMenuFilterOpen(false)}
        />
      )}

      {isTableFilterOpen && (
        <components.TableFilterSheet
          tableOptions={tableOptions}
          initialRanges={selectedTableRanges}
          onApply={(ranges) => setSelectedTableRanges(ranges)}
          onClose={() => setIsTableFilterOpen(false)}
        />
      )}
    </S.ServeColumn>
  );
};

export default StaffServe;
