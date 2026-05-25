import * as S from "./ServingPage.styled";
import { useState, useEffect, useRef, useCallback } from "react";

import components from "./components";
import type { StaffCallRowItem } from "./components/StaffCallList/StaffCallList";
import TableResetSheet from "./components/TableReset/TableResetSheet";
import Toast from "../../components/toast/Toast";
import { useTableReset } from "@hooks/useTableReset";
import {
  StaffCallItem,
  staffCallAcceptApi,
  staffCallCancelApi,
  staffCallCompleteApi,
} from "../../apis/staffCallApi";
import { useUser } from "@stores/UserContext";
import ServingAcceptModal from "@components/servingacceptmoal/ServingAcceptModal";
import { useStaffCallListSocket } from "@hooks/useStaffCallListSocket";

import StaffServe, {
  type StaffServeUIItem,
} from "./components/StaffServe/StaffServe";

import {
  servingCatchApi,
  servingCompleteApi,
  servingCancelApi,
  serverOrderCancelApi,
  getServingFilterOptions,
} from "./apis/servingApi";

/** "T2" 같은 표기를 "테이블 2번"으로 변환. 숫자가 없으면 폴백 처리 */
const formatTableLabel = (tableNumber?: string | null): string => {
  if (!tableNumber) return "테이블 정보 없음";
  const match = String(tableNumber).match(/\d+/);
  return match ? `테이블 ${match[0]}번` : String(tableNumber);
};

const ServingPage = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"default" | "error">("default");

  const { resetTable } = useTableReset();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"StaffCall" | "StaffServe">(
    "StaffServe"
  );
  /** 직원 호출 패널: 첫 탭 진입까지 마운트 지연으로 초기 부하 분산 */
  const [staffCallPanelMounted, setStaffCallPanelMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (activeTab === "StaffCall") setStaffCallPanelMounted(true);
  }, [activeTab]);
  const [isTableResetOpen, setIsTableResetOpen] = useState(false);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const [serveCount, setServeCount] = useState(0);
  const [validTables, setValidTables] = useState<number[]>([]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await getServingFilterOptions();
        setValidTables(res.data.tables ?? []);
      } catch (error) {
        console.error("테이블 필터 옵션 조회 실패:", error);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    let scrollTimer: ReturnType<typeof setTimeout>;

    const handleScroll = () => {
      setIsVisible(false);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimer);
    };
  }, []);

  interface StaffCallListItem {
    id: number;
    tableNumber: string;
    request: string;
    waitingTime: number;
    active: boolean;
    tableId: number;
    cartId: number;
    callType: string;
    status?: string;
    createdAt?: string;
    tableUsageId?: number;
    cartPrice?: number;
  }

  const isValidStaffCallListItem = (
    item: StaffCallRowItem
  ): item is StaffCallListItem => {
    return (
      Number.isFinite(item.tableId) &&
      Number(item.tableId) > 0 &&
      Number.isFinite(item.cartId) &&
      Number(item.cartId) > 0 &&
      typeof item.callType === "string" &&
      item.callType.trim() !== ""
    );
  };

  const mapStaffCallItem = (raw: StaffCallItem): StaffCallListItem => {
    const id = Number(raw?.id ?? (raw as any)?.staff_call_id);
    const tableId = Number((raw as any)?.table_id ?? (raw as any)?.tableId);
    const cartId = Number((raw as any)?.cart_id ?? (raw as any)?.cartId);
    const callType = String(
      (raw as any)?.call_type ?? (raw as any)?.callType ?? ""
    );

    const rawTableNum =
      (raw as any)?.table_num ??
      (raw as any)?.tableNum ??
      (raw as any)?.tableNumber ??
      (raw as any)?.table_no;
    const tableNumber =
      typeof rawTableNum === "number"
        ? `T${rawTableNum}`
        : typeof rawTableNum === "string"
          ? rawTableNum.startsWith("T")
            ? rawTableNum
            : rawTableNum.trim() === ""
              ? ""
              : `T${rawTableNum}`
          : tableId
            ? `T${tableId}`
            : "";

    const waitingTime = Number(
      (raw as any)?.waiting_sec ??
        (raw as any)?.waitingTime ??
        (raw as any)?.waiting_time ??
        0
    );

    const statusRaw = String((raw as any)?.status ?? "")
      .trim()
      .toUpperCase();
    const isInactive =
      statusRaw === "ACCEPTED" ||
      statusRaw === "ACCEPTED_BY_STAFF" ||
      statusRaw === "COMPLETED";

    const hasValidId = Number.isFinite(id) && id > 0;

    const canAccept =
      hasValidId &&
      Number.isFinite(tableId) &&
      tableId > 0 &&
      Number.isFinite(cartId) &&
      cartId > 0 &&
      callType.trim() !== "" &&
      !isInactive;

    return {
      id: hasValidId ? id : 0,
      tableNumber,
      request: callType,
      waitingTime: Number.isFinite(waitingTime) ? waitingTime : 0,
      active: canAccept,
      tableId: Number.isFinite(tableId) ? tableId : 0,
      cartId: Number.isFinite(cartId) ? cartId : 0,
      callType,
      status: statusRaw || undefined,
      createdAt: (raw as any)?.created_at ?? (raw as any)?.createdAt,
      tableUsageId: (() => {
        const v =
          (raw as any)?.table_usage_id ??
          (raw as any)?.tableUsageId ??
          (raw as any)?.cart?.table_usage_id ??
          (raw as any)?.cart?.tableUsageId ??
          (raw as any)?.cart?.table_usage?.id ??
          (raw as any)?.table_usage?.id;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      })(),
      cartPrice: (() => {
        const v = (raw as any)?.cart_price ?? (raw as any)?.cartPrice;
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
      })(),
    };
  };

  const [StaffCallList, setStaffCallList] = useState<StaffCallListItem[]>([]);
  const [staffCallTotal, setStaffCallTotal] = useState<number>(0);

  const [acceptModalItem, setAcceptModalItem] =
    useState<StaffCallListItem | null>(null);
  const acceptModalAutoCloseTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (acceptModalAutoCloseTimeoutRef.current) {
        clearTimeout(acceptModalAutoCloseTimeoutRef.current);
        acceptModalAutoCloseTimeoutRef.current = null;
      }
    };
  }, []);

  const [serveModalItem, setServeModalItem] =
    useState<StaffServeUIItem | null>(null);

  useEffect(() => {
    const isOverlayOpen =
      isTableResetOpen || Boolean(acceptModalItem) || Boolean(serveModalItem);
    if (!isOverlayOpen) return;

    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [isTableResetOpen, acceptModalItem, serveModalItem]);

  const staffCallWsEnabled = Boolean(user?.booth_id);

  const {
    isRefreshing: isStaffCallRefreshing,
    requestList: requestStaffCallList,
  } = useStaffCallListSocket({
    enabled: staffCallWsEnabled,
    onListUpdate: ({ items, total }) => {
      setStaffCallList(
        items.map((raw) => mapStaffCallItem(raw as StaffCallItem))
      );
      if (typeof total === "number") {
        setStaffCallTotal(total);
      }
    },
    onError: (message) => {
      setToastMessage(message);
      setToastType("error");
    },
  });

  const handleTabChange = useCallback((tab: "StaffCall" | "StaffServe") => {
    setActiveTab(tab);
  }, []);

  const handleAccept = async (payload: {
    tableId: number;
    cartId: number;
    callType: string;
  }): Promise<boolean> => {
    if (
      !Number.isFinite(payload.tableId) ||
      payload.tableId <= 0 ||
      !Number.isFinite(payload.cartId) ||
      payload.cartId <= 0 ||
      payload.callType.trim() === ""
    ) {
      setToastMessage(
        "수락에 필요한 정보가 부족합니다. 잠시 후 다시 시도해주세요."
      );
      setToastType("error");
      return false;
    }

    try {
      const res = await staffCallAcceptApi({
        tableId: payload.tableId,
        cartId: payload.cartId,
        callType: payload.callType,
      });

      setToastMessage(res.message || "호출을 수락했습니다.");
      setToastType("default");
      return true;
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "호출 수락 중 오류가 발생했습니다.";
      setToastMessage(msg);
      setToastType("error");
      return false;
    }
  };

  const handleRequestAccept = async (item: StaffCallRowItem) => {
    if (!item.active) return;

    if (!isValidStaffCallListItem(item)) {
      setToastMessage(
        "수락에 필요한 정보가 부족합니다. 잠시 후 다시 시도해주세요."
      );
      setToastType("error");
      return;
    }

    const success = await handleAccept({
      tableId: item.tableId,
      cartId: item.cartId,
      callType: item.callType,
    });

    if (!success) return;

    setAcceptModalItem(item);

    if (acceptModalAutoCloseTimeoutRef.current) {
      clearTimeout(acceptModalAutoCloseTimeoutRef.current);
      acceptModalAutoCloseTimeoutRef.current = null;
    }

    // acceptModalAutoCloseTimeoutRef.current = setTimeout(() => {
    //   setAcceptModalItem((prev) => {
    //     if (!prev) return prev;
    //     return null;
    //   });
    //   acceptModalAutoCloseTimeoutRef.current = null;
    // }, 7000);
  };

  const handleModalCancelAccept = async () => {
    const item = acceptModalItem;
    if (!item) return;

    if (
      !Number.isFinite(item.tableId) ||
      item.tableId <= 0 ||
      !Number.isFinite(item.cartId) ||
      item.cartId <= 0 ||
      !item.callType?.trim()
    ) {
      setToastMessage("취소에 필요한 정보가 부족합니다.");
      setToastType("error");
      return;
    }

    try {
      const res = await staffCallCancelApi({
        tableId: item.tableId,
        cartId: item.cartId,
        callType: item.callType,
      });
      setToastMessage(res.message || "호출 수락을 취소했습니다.");
      setToastType("default");
      setAcceptModalItem(null);

      if (acceptModalAutoCloseTimeoutRef.current) {
        clearTimeout(acceptModalAutoCloseTimeoutRef.current);
        acceptModalAutoCloseTimeoutRef.current = null;
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "호출 수락 취소 중 오류가 발생했습니다.";
      setToastMessage(msg);
      setToastType("error");
    }
  };

  const handleAcceptModalCancelOrder = async () => {
    const item = acceptModalItem;
    if (!item) return;

    const staffCallIdCandidate = item.id;

    if (!Number.isFinite(staffCallIdCandidate) || staffCallIdCandidate <= 0) {
      setToastMessage("staffCallId가 없어 주문 취소를 진행할 수 없습니다.");
      setToastType("error");
      return;
    }

    if (!item.callType?.trim()) {
      setToastMessage("취소에 필요한 정보가 부족합니다.");
      setToastType("error");
      return;
    }

    try {
      await serverOrderCancelApi({ staffCallId: staffCallIdCandidate });

      setStaffCallList((prev) => prev.filter((v) => v.id !== item.id));
      setStaffCallTotal((prev) => Math.max(prev - 1, 0));

      setAcceptModalItem(null);
      setToastMessage("주문이 취소되었습니다.");
      setToastType("default");

      if (acceptModalAutoCloseTimeoutRef.current) {
        clearTimeout(acceptModalAutoCloseTimeoutRef.current);
        acceptModalAutoCloseTimeoutRef.current = null;
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "주문 취소 중 오류가 발생했습니다.";
      setToastMessage(msg);
      setToastType("error");
    }
  };

  const handleServeCatch = useCallback(
    async (item: StaffServeUIItem) => {
      if (!item.canCatch) return;
      try {
        const resMsg = await servingCatchApi(item.taskId);
        setToastMessage(resMsg || "서빙을 시작합니다.");
        setToastType("default");

        setServeModalItem({
          ...item,
          status: "SERVING",
          isMine: true,
          canCatch: false,
          canComplete: true,
          canCancel: true,
          disabled: false,
          isProcessingByMe: true,
          active: false,
        });
      } catch (err: any) {
        setToastMessage(
          err?.response?.data?.message ||
            err?.message ||
            "서빙 수락 중 오류가 발생했습니다."
        );
        setToastType("error");
      }
    },
    []
  );

  const handleRestoreActiveServe = useCallback(
    (item: StaffServeUIItem | null) => {
      setServeModalItem((prev) => {
        // item이 null이면 현재 상태 유지: 방금 catch한 모달이 즉시 닫히는 race condition 방지.
        // 모달 닫기는 handleServeComplete / handleServeCancel에서 명시적으로만 처리.
        if (!item) return prev;
        if (prev?.taskId === item.taskId) return prev;
        return item;
      });
    },
    []
  );

  const handleServeComplete = async () => {
    if (!serveModalItem) return;
    if (!serveModalItem.canComplete) return;

    try {
      const resMsg = await servingCompleteApi(serveModalItem.taskId);
      setToastMessage(resMsg || "서빙이 완료되었습니다.");
      setToastType("default");
      setServeModalItem(null);
    } catch (err: any) {
      setToastMessage(
        err?.response?.data?.message ||
          err?.message ||
          "서빙 완료 처리 중 오류가 발생했습니다."
      );
      setToastType("error");
    }
  };

  const handleServeCancel = async () => {
    if (!serveModalItem) return;
    if (!serveModalItem.canCancel) return;

    try {
      const resMsg = await servingCancelApi(serveModalItem.taskId);
      setToastMessage(resMsg || "서빙을 취소했습니다.");
      setToastType("default");
      setServeModalItem(null);
    } catch (err: any) {
      setToastMessage(
        err?.response?.data?.message ||
          err?.message ||
          "서빙 취소 처리 중 오류가 발생했습니다."
      );
      setToastType("error");
    }
  };

  const handleStaffCallCompleted = async () => {
    if (!acceptModalItem) return;

    try {
      await staffCallCompleteApi({
        tableId: acceptModalItem.tableId,
        cartId: acceptModalItem.cartId,
        callType: acceptModalItem.callType,
      });
      setAcceptModalItem(null);
      setToastMessage("직원호출이 완료되었습니다.");
      setToastType("default");

      if (acceptModalAutoCloseTimeoutRef.current) {
        clearTimeout(acceptModalAutoCloseTimeoutRef.current);
        acceptModalAutoCloseTimeoutRef.current = null;
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "직원호출 완료 처리 중 오류가 발생했습니다.";
      setToastMessage(msg);
      setToastType("error");
    }
  };

  const handlePaymentConfirmOrdered = async () => {
    if (!acceptModalItem) return;

    try {
      await staffCallCompleteApi({
        tableId: acceptModalItem.tableId,
        cartId: acceptModalItem.cartId,
        callType: acceptModalItem.callType,
      });
      setAcceptModalItem(null);
      setToastMessage("결제가 확인되어 주문이 완료되었습니다.");
      setToastType("default");

      if (acceptModalAutoCloseTimeoutRef.current) {
        clearTimeout(acceptModalAutoCloseTimeoutRef.current);
        acceptModalAutoCloseTimeoutRef.current = null;
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "결제 확인 처리 중 오류가 발생했습니다.";
      setToastMessage(msg);
      setToastType("error");
    }
  };

  return (
    <S.Wrapper>
      <components.SelectTap
        activeTab={activeTab}
        onTabChange={handleTabChange}
        staffServeCount={serveCount}
        staffCallCount={staffCallTotal}
      />

      <S.MainContent>
        <S.TabPanel
          $visible={activeTab === "StaffServe"}
          role="tabpanel"
          aria-hidden={activeTab !== "StaffServe"}
        >
          <StaffServe
            onUpdateServeCount={setServeCount}
            onAcceptServe={handleServeCatch}
            onRestoreActiveServe={handleRestoreActiveServe}
          />
        </S.TabPanel>

        {staffCallPanelMounted && (
          <S.TabPanel
            $visible={activeTab === "StaffCall"}
            role="tabpanel"
            aria-hidden={activeTab !== "StaffCall"}
          >
            <components.StaffCallList
              StaffCallList={StaffCallList}
              nowTick={nowTick}
              onRefresh={requestStaffCallList}
              refreshing={isStaffCallRefreshing}
              onRequestAccept={(item) => void handleRequestAccept(item)}
            />
          </S.TabPanel>
        )}
      </S.MainContent>

      <components.ResetBtn
        isVisible={isVisible}
        onClick={() => setIsTableResetOpen(true)}
      />

      {isTableResetOpen && (
        <TableResetSheet
          onClose={() => setIsTableResetOpen(false)}
          validTables={validTables}
          onInvalidSubmit={(message) => {
            setToastMessage(message);
            setToastType("error");
          }}
          onSubmit={async (tableNumber) => {
            const result = await resetTable({
              table_nums: [Number(tableNumber)],
            });

            if (!result.success) {
              setToastMessage(
                result.errorMsg ||
                  "초기화할 수 없는 테이블입니다"
              );
              setToastType("error");
              return false;
            }

            setToastMessage(
              result.payload?.message || "테이블이 초기화되었습니다."
            );
            setToastType("default");
            return true;
          }}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {acceptModalItem && (
        <S.AcceptModalLayer>
          <ServingAcceptModal
            callType={acceptModalItem.callType}
            tableNumberText={formatTableLabel(acceptModalItem.tableNumber)}
            extraContentText={(() => {
              const t = String(acceptModalItem.callType ?? "")
                .trim()
                .toUpperCase();

              if (t === "STAFF_CALL") return undefined;
              return acceptModalItem.cartPrice !== undefined
                ? `${acceptModalItem.cartPrice.toLocaleString("ko-KR")}원`
                : undefined;
            })()}
            onCancelAccept={() => void handleModalCancelAccept()}
            onCancelOrder={() => void handleAcceptModalCancelOrder()}
            onSlideComplete={
              String(acceptModalItem.callType ?? "")
                .trim()
                .toUpperCase() === "PAYMENT_CONFIRM"
                ? () => void handlePaymentConfirmOrdered()
                : () => void handleStaffCallCompleted()
            }
          />
        </S.AcceptModalLayer>
      )}

      {serveModalItem && (
        <S.AcceptModalLayer>
          <ServingAcceptModal
            variant="serviceClick"
            tableNumberText={
              serveModalItem.rawTableNumber != null
                ? `테이블 ${serveModalItem.rawTableNumber}번`
                : "테이블 정보 없음"
            }
            extraContentText={`${serveModalItem.menuName} ${serveModalItem.quantity}개`}
            onClickComplete={() => void handleServeComplete()}
            onCancelAccept={() => void handleServeCancel()}
          />
        </S.AcceptModalLayer>
      )}
    </S.Wrapper>
  );
};

export default ServingPage;
