import { useCallback, useEffect, useRef, useState } from "react";

const LIST_PAYLOAD = { type: "LIST" as const, limit: 20, offset: 0 };

/**
 * The server broadcasts PONG periodically.
 * Use passive heartbeat: reconnect only when no valid server message arrives.
 */
const IDLE_TIMEOUT_MS = 60_000;
const IDLE_CHECK_INTERVAL_MS = 10_000;
const RECONNECT_BASE_DELAY_MS = 3_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const MAX_RECONNECT_COUNT = 5;
const AUTH_FAILURE_CLOSE_CODES = new Set([4001, 1008]);

/** `VITE_BASE_URL`(https://host) -> `wss://host/ws/server/staffcall` */
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
 * Staff call list: wss://.../ws/server/staffcall
 * - Sends LIST on connect and handles LIST_RESULT / STAFF_CALL_SNAPSHOT.
 * - Uses passive heartbeat based on server messages.
 * - Retries reconnect with bounded exponential backoff.
 */
export function useStaffCallListSocket(options: UseStaffCallListSocketOptions) {
  const onListUpdateRef = useRef(options.onListUpdate);
  const onErrorRef = useRef(options.onError);
  onListUpdateRef.current = options.onListUpdate;
  onErrorRef.current = options.onError;

  const wsRef = useRef<WebSocket | null>(null);
  const sendListRef = useRef<() => void>(() => {});
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setIsRefreshing(false);
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
    let reconnectStopped = false;
    let idleCheckId: ReturnType<typeof setInterval> | null = null;
    let reconnectId: ReturnType<typeof setTimeout> | null = null;
    let lastMessageAt = Date.now();

    const clearIdleCheck = () => {
      if (idleCheckId != null) {
        clearInterval(idleCheckId);
        idleCheckId = null;
      }
    };

    const clearReconnect = () => {
      if (reconnectId != null) {
        clearTimeout(reconnectId);
        reconnectId = null;
      }
    };

    const touchActivity = () => {
      lastMessageAt = Date.now();
      reconnectCount = 0;
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
      if (cancelled || reconnectStopped || reconnectId != null) return;

      if (reconnectCount >= MAX_RECONNECT_COUNT) {
        reconnectStopped = true;
        setIsRefreshing(false);
        onErrorRef.current?.(
          "직원 호출 연결을 복구하지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
        return;
      }

      reconnectCount += 1;
      const delay = getReconnectDelayMs(reconnectCount);
      reconnectId = setTimeout(() => {
        reconnectId = null;
        if (!cancelled) connect();
      }, delay);
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
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        }
      }, IDLE_CHECK_INTERVAL_MS);
    };

    const connect = () => {
      if (cancelled || reconnectStopped) return;

      clearIdleCheck();
      clearReconnect();

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
        lastMessageAt = Date.now();
        setIsConnected(true);
        setIsRefreshing(true);
        ws.send(JSON.stringify(LIST_PAYLOAD));
        startIdleWatchdog(ws);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type?: string;
            data?: unknown;
            total?: number;
            staff_call_id?: unknown;
            status?: unknown;
          };
          touchActivity();

          if (String(msg.type ?? "").toUpperCase() === "PONG") {
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
              setIsRefreshing(true);
              sendListRef.current();
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

      ws.onclose = (event) => {
        clearIdleCheck();
        setIsConnected(false);
        setIsRefreshing(false);

        const wasActive = wsRef.current === ws;
        if (wasActive) wsRef.current = null;

        if (AUTH_FAILURE_CLOSE_CODES.has(event.code)) {
          reconnectStopped = true;
          onErrorRef.current?.(
            "직원 호출 연결 인증이 만료되었습니다. 다시 로그인해 주세요."
          );
          return;
        }

        if (cancelled || intentionalClose || !wasActive) return;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      intentionalClose = true;
      clearIdleCheck();
      clearReconnect();
      closeSocket(wsRef.current);
      wsRef.current = null;
      setIsConnected(false);
      setIsRefreshing(false);
    };
  }, [options.enabled]);

  return { isConnected, isRefreshing, requestList };
}
