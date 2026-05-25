import { useCallback, useEffect, useRef, useState } from "react";

const LIST_PAYLOAD = { type: "LIST" as const, limit: 20, offset: 0 };
const PING_PAYLOAD = { type: "PING" as const };

/** 권장: 30~60초 */
const PING_INTERVAL_MS = 30_000;
/** 권장: 3~5초 — 중간값 */
const PONG_DEADLINE_MS = 3_000;
const RECONNECT_DELAY_MS = 1_500;
const MAX_RECONNECT_COUNT = 5;

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

/**
 * 직원 호출 목록: wss://…/ws/server/staffcall
 * - 연결 후 LIST 전송, LIST_RESULT / STAFF_CALL_SNAPSHOT 으로 목록 갱신
 * - 주기적 PING / PONG 하트비트, PONG 지연 시 재연결 후 LIST로 동기화
 * - 연결 실패 시 최대 MAX_RECONNECT_COUNT회 재시도
 */
export function useStaffCallListSocket(options: UseStaffCallListSocketOptions) {
  const onListUpdateRef = useRef(options.onListUpdate);
  const onErrorRef = useRef(options.onError);
  onListUpdateRef.current = options.onListUpdate;
  onErrorRef.current = options.onError;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sendList = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(LIST_PAYLOAD));
  }, []);

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
    let pingIntervalId: ReturnType<typeof setInterval> | null = null;
    let pongDeadlineId: ReturnType<typeof setTimeout> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;

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

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (reconnectCount >= MAX_RECONNECT_COUNT) {
        onErrorRef.current?.(
          "직원 호출 연결을 복구하지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
        setIsRefreshing(false);
        return;
      }
      reconnectCount += 1;
      clearReconnect();
      reconnectId = setTimeout(() => {
        reconnectId = null;
        if (!cancelled) connect();
      }, RECONNECT_DELAY_MS);
    };

    const sendPingStartWatchdog = (ws: WebSocket) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      clearPongDeadline();
      try {
        ws.send(JSON.stringify(PING_PAYLOAD));
      } catch {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        return;
      }
      pongDeadlineId = setTimeout(() => {
        pongDeadlineId = null;
        if (cancelled) return;
        if (wsRef.current !== ws) return;

        try {
          ws.close();
        } catch {
          /* ignore */
        }
      }, PONG_DEADLINE_MS);
    };

    const connect = () => {
      if (cancelled) return;

      clearPingInterval();
      clearPongDeadline();
      clearReconnect();

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectCount = 0;
        setIsConnected(true);
        setIsRefreshing(true);
        ws.send(JSON.stringify(LIST_PAYLOAD));

        clearPingInterval();
        pingIntervalId = setInterval(() => {
          if (cancelled || ws.readyState !== WebSocket.OPEN) return;
          sendPingStartWatchdog(ws);
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          console.log("[StaffCallWS] raw message:", event.data);
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            data?: unknown;
            total?: number;
            staff_call_id?: unknown;
            status?: unknown;
          };
          console.log("[StaffCallWS] parsed:", msg);

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
            const status = String((msg as any)?.status ?? "")
              .trim()
              .toUpperCase();

            console.log("[StaffCallWS] status event:", {
              staffCallId: Number((msg as any)?.staff_call_id),
              status,
            });

            if (status === "DELETED") {
              setIsRefreshing(true);
              sendList();
            }
            return;
          }
        } catch {
          onErrorRef.current?.("목록 메시지를 처리하지 못했습니다.");
          setIsRefreshing(false);
        }
      };

      ws.onerror = () => {
        onErrorRef.current?.("직원 호출 연결 오류");
        setIsRefreshing(false);
      };

      ws.onclose = () => {
        clearPingInterval();
        clearPongDeadline();
        setIsConnected(false);

        const wasActive = wsRef.current === ws;
        if (wasActive) wsRef.current = null;

        if (!cancelled && wasActive) {
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearPingInterval();
      clearPongDeadline();
      clearReconnect();
      wsRef.current?.close();
      if (wsRef.current) wsRef.current = null;
    };
  }, [options.enabled, sendList]);

  return { isConnected, isRefreshing, requestList };
}
