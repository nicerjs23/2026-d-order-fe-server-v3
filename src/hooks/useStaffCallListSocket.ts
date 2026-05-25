import { useCallback, useEffect, useRef, useState } from "react";

const LIST_PAYLOAD = { type: "LIST" as const, limit: 20, offset: 0 };
const PING_PAYLOAD = { type: "PING" as const };

/** 권장 30~60초 */
const PING_INTERVAL_MS = 60_000;
/** 기존 3초는 서버 지연 시 불필요한 재연결 유발 → 15초 */
const PONG_DEADLINE_MS = 15_000;

/** PING/PONG 외에도 완전 무응답일 때만 끊기 (PING 주기 + PONG 대기보다 길게) */
const IDLE_TIMEOUT_MS = 120_000;
const IDLE_CHECK_INTERVAL_MS = 30_000;

const RECONNECT_BASE_DELAY_MS = 2_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const MAX_RECONNECT_COUNT = 5;

const LIST_DEBOUNCE_MS = 500;

/** `VITE_BASE_URL`(https://host) → `wss://host/ws/server/staffcall` */
export function getStaffCallServerWebSocketUrl(): string {
  const base = import.meta.env.VITE_BASE_URL || "";
  if (!base) {
    throw new Error("VITE_BASE_URL is not set");
  }
  const u = new URL(base);
  const protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${u.host}/ws/server/staffcall`;
}

export interface StaffCallListWsPayload {
  items: unknown[];
  total?: number;
}

interface UseStaffCallListSocketOptions {
  enabled: boolean;
  onListUpdate: (payload: StaffCallListWsPayload) => void;
  onError?: (message: string) => void;
}

const getReconnectDelayMs = (attempt: number) =>
  Math.min(
    RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1),
    RECONNECT_MAX_DELAY_MS
  );

/**
 * 직원 호출 목록: wss://…/ws/server/staffcall
 * - 연결 후 LIST 1회, LIST_RESULT / STAFF_CALL_SNAPSHOT 으로 목록 갱신
 * - 60초마다 PING, PONG은 PONG_DEADLINE_MS(15초) 내 미수신 시에만 재연결
 * - 그 외 완전 무응답(IDLE_TIMEOUT_MS) 시 재연결
 * - 연결 실패 시 지수 백오프로 최대 MAX_RECONNECT_COUNT회 재시도
 */
export function useStaffCallListSocket(options: UseStaffCallListSocketOptions) {
  const onListUpdateRef = useRef(options.onListUpdate);
  const onErrorRef = useRef(options.onError);
  onListUpdateRef.current = options.onListUpdate;
  onErrorRef.current = options.onError;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sendListRef = useRef<() => void>(() => {});

  const sendList = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(LIST_PAYLOAD));
  }, []);

  sendListRef.current = sendList;

  const requestList = useCallback(
    (opts?: { silent?: boolean }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (!opts?.silent) {
          onErrorRef.current?.(
            "연결이 준비되지 않았습니다. 잠시 후 다시 시도해 주세요."
          );
        }
        return;
      }
      setIsRefreshing(true);
      sendList();
    },
    [sendList]
  );

  useEffect(() => {
    if (!options.enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
      return;
    }

    let url: string;
    try {
      url = getStaffCallServerWebSocketUrl();
    } catch (e) {
      onErrorRef.current?.(
        e instanceof Error ? e.message : "WebSocket URL을 만들 수 없습니다."
      );
      return;
    }

    let cancelled = false;
    let reconnectCount = 0;
    let intentionalClose = false;
    let idleCheckId: ReturnType<typeof setInterval> | null = null;
    let pingIntervalId: ReturnType<typeof setInterval> | null = null;
    let pongDeadlineId: ReturnType<typeof setTimeout> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;
    let listDebounceId: ReturnType<typeof setTimeout> | null = null;
    let lastMessageAt = Date.now();

    const clearIdleCheck = () => {
      if (idleCheckId != null) {
        clearInterval(idleCheckId);
        idleCheckId = null;
      }
    };

    const clearPingInterval = () => {
      if (pingIntervalId != null) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
      }
    };

    const clearPongDeadline = () => {
      if (pongDeadlineId != null) {
        clearTimeout(pongDeadlineId);
        pongDeadlineId = null;
      }
    };

    const clearReconnect = () => {
      if (reconnectId != null) {
        clearTimeout(reconnectId);
        reconnectId = null;
      }
    };

    const clearListDebounce = () => {
      if (listDebounceId != null) {
        clearTimeout(listDebounceId);
        listDebounceId = null;
      }
    };

    const touchActivity = () => {
      lastMessageAt = Date.now();
    };

    const sendListNow = () => {
      sendListRef.current();
    };

    const scheduleListRefresh = () => {
      clearListDebounce();
      listDebounceId = setTimeout(() => {
        listDebounceId = null;
        if (cancelled) return;
        setIsRefreshing(true);
        sendListNow();
      }, LIST_DEBOUNCE_MS);
    };

    const detachSocketHandlers = (ws: WebSocket) => {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
    };

    const closeSocket = (ws: WebSocket | null) => {
      if (!ws) return;
      detachSocketHandlers(ws);
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectId != null) return;

      if (reconnectCount >= MAX_RECONNECT_COUNT) {
        onErrorRef.current?.(
          "직원 호출 연결을 복구하지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
        setIsRefreshing(false);
        return;
      }

      reconnectCount += 1;
      const delay = getReconnectDelayMs(reconnectCount);
      reconnectId = setTimeout(() => {
        reconnectId = null;
        if (!cancelled) connect();
      }, delay);
    };

    const sendPingStartWatchdog = (ws: WebSocket) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      clearPongDeadline();
      try {
        ws.send(JSON.stringify(PING_PAYLOAD));
      } catch {
        ws.close();
        return;
      }
      pongDeadlineId = setTimeout(() => {
        pongDeadlineId = null;
        if (cancelled || wsRef.current !== ws) return;
        ws.close();
      }, PONG_DEADLINE_MS);
    };

    const startPingInterval = (ws: WebSocket) => {
      clearPingInterval();
      pingIntervalId = setInterval(() => {
        if (
          cancelled ||
          wsRef.current !== ws ||
          ws.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        sendPingStartWatchdog(ws);
      }, PING_INTERVAL_MS);
    };

    const startIdleWatchdog = (ws: WebSocket) => {
      clearIdleCheck();
      idleCheckId = setInterval(() => {
        if (
          cancelled ||
          wsRef.current !== ws ||
          ws.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        if (Date.now() - lastMessageAt > IDLE_TIMEOUT_MS) {
          intentionalClose = false;
          ws.close();
        }
      }, IDLE_CHECK_INTERVAL_MS);
    };

    const connect = () => {
      if (cancelled) return;

      clearIdleCheck();
      clearPingInterval();
      clearPongDeadline();
      clearReconnect();
      clearListDebounce();

      const previous = wsRef.current;
      if (previous) {
        intentionalClose = true;
        closeSocket(previous);
        if (wsRef.current === previous) wsRef.current = null;
      }
      intentionalClose = false;

      const ws = new WebSocket(url);
      wsRef.current = ws;
      lastMessageAt = Date.now();

      ws.onopen = () => {
        reconnectCount = 0;
        touchActivity();
        setIsConnected(true);
        setIsRefreshing(true);
        ws.send(JSON.stringify(LIST_PAYLOAD));
        startPingInterval(ws);
        startIdleWatchdog(ws);
      };

      ws.onmessage = (event) => {
        touchActivity();
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            data?: unknown;
            total?: number;
            staff_call_id?: unknown;
            status?: unknown;
          };

          if (String(msg.type ?? "").toUpperCase() === "PONG") {
            clearPongDeadline();
            return;
          }

          if (
            msg.type === "LIST_RESULT" ||
            msg.type === "STAFF_CALL_SNAPSHOT"
          ) {
            const data = Array.isArray(msg.data) ? msg.data : [];
            onListUpdateRef.current({
              items: data,
              total: typeof msg.total === "number" ? msg.total : undefined,
            });
            setIsRefreshing(false);
            return;
          }

          if (msg.type === "STAFF_CALL_STATUS") {
            const status = String(msg.status ?? "")
              .trim()
              .toUpperCase();

            if (status === "DELETED") {
              scheduleListRefresh();
            }
            return;
          }
        } catch {
          onErrorRef.current?.("목록 메시지를 처리하지 못했습니다.");
          setIsRefreshing(false);
        }
      };

      ws.onerror = () => {
        setIsRefreshing(false);
      };

      ws.onclose = () => {
        clearIdleCheck();
        clearPingInterval();
        clearPongDeadline();
        setIsConnected(false);

        const wasActive = wsRef.current === ws;
        if (wasActive) wsRef.current = null;

        if (cancelled || intentionalClose || !wasActive) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      intentionalClose = true;
      clearIdleCheck();
      clearPingInterval();
      clearPongDeadline();
      clearReconnect();
      clearListDebounce();
      closeSocket(wsRef.current);
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [options.enabled]);

  return { isConnected, isRefreshing, requestList };
}
