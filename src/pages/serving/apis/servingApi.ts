import { instance } from "@services/instance";
import { getServerClientId } from "../../../utils/getServerClientId";

// Backend returns requested and in-progress serving tasks.
export type ServingTaskStatus = "SERVE_REQUESTED" | "SERVING" | "SERVED";

export interface ServingTaskResponse {
  taskId: number;
  orderItemId: number;
  /** 일부 WS/조회 응답에 테이블 번호가 포함될 수 있음 */
  tableNumber: number | null;
  menuId: number | null;
  menuName: string | null;
  quantity: number | null;
  status: ServingTaskStatus;
  /** UUID from X-Server-Client-Id, not a username. */
  catchedBy: string | null;
  isMine: boolean | null;
  canCatch: boolean | null;
  canComplete: boolean | null;
  canCancel: boolean | null;
  requestedAt: string;
}

const serverClientHeaders = () => ({
  "X-Server-Client-Id": getServerClientId(),
});

export interface ServingFilterMenuOption {
  id: number;
  name: string;
  isSetMenu?: boolean;
  isSet?: boolean;
  is_set_menu?: boolean;
  is_set?: boolean;
  menuType?: string;
  type?: string;
  category?: string;
}

export const isVisibleServingFilterMenu = (menu: ServingFilterMenuOption) => {
  const menuName = menu.name.trim();
  const menuTypes = [menu.menuType, menu.type, menu.category]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toUpperCase());

  const isSetMenu =
    menu.isSetMenu === true ||
    menu.isSet === true ||
    menu.is_set_menu === true ||
    menu.is_set === true ||
    menuTypes.some((value) => value.includes("SET")) ||
    menuName.includes("세트");

  return menuName !== "테이블 이용료" && !isSetMenu;
};

export interface ServingFilterOptionsData {
  menus: ServingFilterMenuOption[];
  tableCount: number;
  tables: number[];
}

export interface ServingFilterOptionsResponse {
  message: string;
  data: ServingFilterOptionsData;
}

// 1. 운영자 서빙 대기 목록 조회 API
export const getServingCalls = async () => {
  const response = await instance.get<ServingTaskResponse[]>(
    `/api/v3/spring/serving/servingcall`,
    { headers: serverClientHeaders() }
  );
  return response.data;
};

export const getServingCallsByBoothId = async (boothId: number) => {
  const response = await instance.get<ServingTaskResponse[]>(
    `/api/v3/spring/serving/servingcall/${boothId}`,
    { headers: serverClientHeaders() }
  );
  return response.data;
};

export const getServingFilterOptions = async (): Promise<ServingFilterOptionsResponse> => {
  const response = await instance.get<ServingFilterOptionsResponse>(
    "/api/v3/spring/serving/filter-options"
  );
  return response.data;
};

// 2. 서빙 상태 변경 : 서빙 요청 수락 (SERVE_REQUESTED -> SERVING)
export const servingCatchApi = async (taskId: number) => {
  const response = await instance.post<string>(
    "/api/v3/spring/serving/catchcall",
    null,
    { params: { taskId }, headers: serverClientHeaders() }
  );
  return response.data;
};

// 3. 서빙 상태 변경 : 서빙 완료 (SERVING -> SERVED)
export const servingCompleteApi = async (taskId: number) => {
  const response = await instance.post<string>(
    "/api/v3/spring/serving/complete",
    null,
    { params: { taskId }, headers: serverClientHeaders() }
  );
  return response.data;
};

// 4. 서빙 상태 변경 : 서빙 요청 수락 취소 (SERVING -> SERVE_REQUESTED)
export const servingCancelApi = async (taskId: number) => {
  const response = await instance.post<string>(
    "/api/v3/spring/serving/cancel",
    null,
    { params: { taskId }, headers: serverClientHeaders() }
  );
  return response.data;
};

// 5. 주문 취소 (직원/운영용) : /server/order/cancel
// NOTE: spring 서버에서 staff_call 기준으로 검증(booth_id 일치)하므로 staffCallId(taskId)를 전송
export const serverOrderCancelApi = async (body: { staffCallId: number }) => {
  const response = await instance.post<string>(
    "/api/v3/spring/server/order/cancel",
    { staffCallId: Number(body.staffCallId) }
  );
  return response.data;
};
