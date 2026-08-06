"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SocketStatus = "connecting" | "connected" | "disconnected";

export interface UseSocketOptions {
  /** URL máy chủ Socket.io (mặc định lấy từ env hoặc localhost:3001) */
  url?: string;
  /** Tự động kết nối khi mount (mặc định true) */
  autoConnect?: boolean;
}

export interface UseSocketReturn {
  /** Trạng thái kết nối hiện tại */
  status: SocketStatus;
  /** Socket instance (có thể null nếu chưa kết nối) */
  socket: Socket | null;
  /** Kết nối thủ công */
  connect: () => void;
  /** Ngắt kết nối thủ công */
  disconnect: () => void;
  /** Đăng ký listener cho một event */
  on: <T = unknown>(event: string, handler: (data: T) => void) => void;
  /** Bỏ đăng ký listener */
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  /** Emit event */
  emit: (event: string, ...args: unknown[]) => void;
}

// ── Socket URL ────────────────────────────────────────────────────────────────

const SOCKET_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SOCKET_URL ??
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ??
      "http://localhost:3001")
    : "http://localhost:3001";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { url = SOCKET_URL, autoConnect = true } = options;

  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  // Khởi tạo socket connection
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("bizflow.accessToken")
        : null;

    const socket = io(url, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // ── Lifecycle listeners ──
    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      setStatus("connecting");
    });

    socket.io.on("reconnect", () => {
      setStatus("connected");
    });

    // Auto-connect
    if (autoConnect) {
      setStatus("connecting");
      socket.connect();
    }

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // ── Manual connect/disconnect ──
  const connect = useCallback(() => {
    const s = socketRef.current;
    if (s && !s.connected) {
      setStatus("connecting");
      s.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    const s = socketRef.current;
    if (s && s.connected) {
      s.disconnect();
    }
  }, []);

  // ── Event helpers ──
  const on = useCallback(
    <T = unknown>(event: string, handler: (data: T) => void) => {
      socketRef.current?.on(event, handler as (...args: unknown[]) => void);
    },
    [],
  );

  const off = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      socketRef.current?.off(event, handler);
    },
    [],
  );

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return {
    status,
    socket: socketRef.current,
    connect,
    disconnect,
    on,
    off,
    emit,
  };
}
