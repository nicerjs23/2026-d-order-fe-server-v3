import { useEffect, useRef, useState } from "react";
import { ServingTaskResponse } from "../apis/servingApi";

const PONG_TIMEOUT_MS = 30_000;
const PONG_CHECK_INTERVAL_MS = 5_000;
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_COUNT = 5;

export function getServingWebSocketUrl(): string {
  const base = import.meta.env.VITE_BASE_URL || "";
  if (!base) {
    throw new Error("VITE_BASE_URL is not set");
  }

  const u = new URL(base);
  const protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${u.host}/ws/serving`;
}

export type ServingWsType =
  | "NEW_CALL"
  | "CATCH_CALL"
  | "COMPLETE_CALL"
  | "CANCEL_CALL"
  | "REMOVE_CALL";

export interface ServingRemovePayload {
  boothId: number;
  orderItemId?: number;
  tableNumber?: number;
  reason: string;
  deletedCount: number;
}

export type ServingWsPayload =
  | {
      type: "NEW_CALL" | "CATCH_CALL" | "COMPLETE_CALL" | "CANCEL_CALL";
      data: ServingTaskResponse;
    }
  | {
      type: "REMOVE_CALL";
      data: ServingRemovePayload;
    };

interface UseServingWebSocketProps {
  enabled?: boolean;
  onMessage: (payload: ServingWsPayload) => void;
}

const safeParseMessage = (data: unknown): unknown => {
  if (typeof data !== "string") return data;

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const isPongMessage = (message: unknown) => {
  if (typeof message === "string") {
    return message.toLowerCase() === "pong";
  }

  if (message && typeof message === "object" && "type" in message) {
    return String((message as { type?: unknown }).type).toLowerCase() === "pong";
  }

  return false;
};

export const useServingWebSocket = ({
  enabled = true,
  onMessage,
}: UseServingWebSocketProps) => {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const wsRef = useRef<WebSocket | null>(null);
  const lastPongAtRef = useRef(Date.now());
  const pongWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const clearPongWatchdog = () => {
      if (!pongWatchdogRef.current) return;
      clearInterval(pongWatchdogRef.current);
      pongWatchdogRef.current = null;
    };

    const clearReconnectTimeout = () => {
      if (!reconnectTimeoutRef.current) return;
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    };

    if (!enabled) {
      clearPongWatchdog();
      clearReconnectTimeout();
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
      return;
    }

    let url: string;

    try {
      url = getServingWebSocketUrl();
    } catch (e) {
      // console.error("[ServingWS] URL creation error:", e);
      return;
    }

    let disposed = false;
    let reconnectCount = 0;

    const startPongWatchdog = (ws: WebSocket) => {
      clearPongWatchdog();
      pongWatchdogRef.current = setInterval(() => {
        if (disposed || wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return;

        if (Date.now() - lastPongAtRef.current > PONG_TIMEOUT_MS) {
          // console.warn("[ServingWS] pong timeout. reconnecting...");
          ws.close();
        }
      }, PONG_CHECK_INTERVAL_MS);
    };

    const connect = () => {
      if (disposed) return;

      // console.log(`[ServingWS] connecting: ${url}`);

      const ws = new WebSocket(url);
      wsRef.current = ws;
      lastPongAtRef.current = Date.now();

      ws.onopen = () => {
        // console.log("[ServingWS] connected");
        reconnectCount = 0;
        lastPongAtRef.current = Date.now();
        setIsConnected(true);
        startPongWatchdog(ws);
      };

      ws.onmessage = (event) => {
        try {
          // console.log("[ServingWS] raw message:", event.data);

          const message = safeParseMessage(event.data);
          if (isPongMessage(message)) {
            lastPongAtRef.current = Date.now();
            return;
          }

          const payload = message as ServingWsPayload;
          // console.log(`[ServingWS] parsed [${payload.type}]:`, payload.data);

          if (payload.type && payload.data) {
            onMessageRef.current(payload);
          }
        } catch (error) {
          // console.error("[ServingWS] message parse error:", error);
        }
      };

      ws.onclose = () => {
        // console.log("[ServingWS] closed", {
        //   code: event.code,
        //   reason: event.reason || "none",
        //   wasClean: event.wasClean,
        // });

        clearPongWatchdog();
        setIsConnected(false);
        if (wsRef.current === ws) wsRef.current = null;

        if (disposed) return;
        if (reconnectCount >= MAX_RECONNECT_COUNT) {
          // console.warn("[ServingWS] reconnect stopped. max retry count reached.");
          return;
        }

        reconnectCount += 1;
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        // console.error("[ServingWS] socket error:", error);
      };
    };

    connect();

    return () => {
      disposed = true;
      clearPongWatchdog();
      clearReconnectTimeout();
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  return { isConnected };
};
