"use client";

import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SocketStatus = "connecting" | "connected" | "disconnected";

export interface UseSocketOptions {
  /** URL máy chủ Socket.io (mặc định lấy từ env hoặc localhost:3001) */
  url?: string;
  /** Tự động kết nối khi mount (mặc định true) */
  autoConnect?: boolean;
}

/** Payload sự kiện `new_draft_order` (từ socketServer backend) */
export interface NewDraftOrderPayload {
  draftOrderId: string;
  customerName: string | null;
  itemCount: number;
  totalAmount: number;
}

/** Payload sự kiện `order_confirmed` */
export interface OrderConfirmedPayload {
  orderId: string;
  orderCode: string;
}

/** Payload sự kiện `new_order` */
export interface NewOrderPayload {
  orderId: string;
  customerName: string | null;
  totalAmount: number;
}

/** Payload sự kiện `low_stock_alert` */
export interface LowStockAlertPayload {
  productId: string;
  productName: string;
  currentStock: number;
}

/** Payload sự kiện `notification` */
export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  data?: unknown;
}

/** Một thông báo hiển thị trong chuông thông báo */
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// ── Socket URL ────────────────────────────────────────────────────────────────

const SOCKET_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_SOCKET_URL ??
      process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ??
      "http://localhost:3001")
    : "http://localhost:3001";

// ── Event state (badge + notification bell) ───────────────────────────────────

interface SocketEventState {
  status: SocketStatus;
  /** Số đơn nháp mới nhận được — badge trên menu "AI Đơn hàng" */
  draftCount: number;
  notifications: NotificationItem[];
  unreadCount: number;
}

interface SocketEventActions {
  setStatus: (status: SocketStatus) => void;
  incrementDraftCount: () => void;
  resetDraftCount: () => void;
  pushNotification: (item: NotificationItem) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
}

/** Store dùng chung: cập nhật badge & notification bell khi nhận sự kiện realtime */
export const useSocketStore = create<SocketEventState & SocketEventActions>(
  (set) => ({
    status: "disconnected",
    draftCount: 0,
    notifications: [],
    unreadCount: 0,

    setStatus: (status) => set({ status }),
    incrementDraftCount: () =>
      set((s) => ({ draftCount: s.draftCount + 1 })),
    resetDraftCount: () => set({ draftCount: 0 }),
    pushNotification: (item) =>
      set((s) => ({
        notifications: [item, ...s.notifications].slice(0, 50),
        unreadCount: s.unreadCount + 1,
      })),
    markNotificationsRead: () =>
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.read ? n : { ...n, read: true },
        ),
        unreadCount: 0,
      })),
    clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
  }),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bizflow.accessToken");
}

function makeNotification(
  partial: Pick<NotificationItem, "type" | "title" | "message">,
): NotificationItem {
  return {
    ...partial,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

// ── Shared socket singleton ───────────────────────────────────────────────────
// Nhiều component cùng gọi `useSocket()` sẽ dùng chung MỘT kết nối.
// Socket tự động reconnect khi mất kết nối (reconnection: true).

let sharedSocket: Socket | null = null;
let sharedUrl: string | null = null;
let socketRefCount = 0;

function createSocket(url: string): Socket {
  const token = getAccessToken();

  const socket = io(url, {
    autoConnect: false,
    transports: ["websocket", "polling"],
    // JWT trong handshake — socketServer backend dùng để xác thực
    auth: token ? { token } : undefined,
    // ── Tự động reconnect khi mất kết nối ──
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // ── Lifecycle: cập nhật status + đăng ký room sau khi kết nối ──
  socket.on("connect", () => {
    useSocketStore.getState().setStatus("connected");

    // Đăng ký room theo chuẩn socketServer: subscribe:store + subscribe:user
    const user = useAuthStore.getState().user;
    if (user?.storeId) socket.emit("subscribe:store", user.storeId);
    socket.emit("subscribe:user");
  });

  socket.on("disconnect", () => {
    useSocketStore.getState().setStatus("disconnected");
  });

  socket.on("connect_error", () => {
    useSocketStore.getState().setStatus("disconnected");
  });

  socket.io.on("reconnect_attempt", () => {
    useSocketStore.getState().setStatus("connecting");
  });

  socket.io.on("reconnect", () => {
    useSocketStore.getState().setStatus("connected");
  });

  // ── Subscribe sự kiện: cập nhật badge / notification bell ──
  // (listener giữ nguyên khi reconnect — socket.io không tự xoá)

  socket.on("new_draft_order", (data: NewDraftOrderPayload) => {
    useSocketStore.getState().incrementDraftCount();
    useSocketStore.getState().pushNotification(
      makeNotification({
        type: "draft",
        title: "Đơn nháp mới",
        message: `Đơn nháp ${data.draftOrderId} · ${data.itemCount} mặt hàng · ${formatVND(data.totalAmount)}${data.customerName ? ` · ${data.customerName}` : ""}`,
      }),
    );
  });

  socket.on("order_confirmed", (data: OrderConfirmedPayload) => {
    useSocketStore.getState().pushNotification(
      makeNotification({
        type: "order_confirmed",
        title: "Đơn đã xác nhận",
        message: `Mã đơn ${data.orderCode} đã được xác nhận thành công`,
      }),
    );
  });

  socket.on("new_order", (data: NewOrderPayload) => {
    useSocketStore.getState().pushNotification(
      makeNotification({
        type: "order",
        title: "Đơn hàng mới",
        message: `${data.customerName ?? "Khách lẻ"} · ${formatVND(data.totalAmount)}`,
      }),
    );
  });

  socket.on("low_stock_alert", (data: LowStockAlertPayload) => {
    useSocketStore.getState().pushNotification(
      makeNotification({
        type: "low_stock",
        title: "Cảnh báo tồn kho",
        message: `${data.productName} chỉ còn ${data.currentStock} đơn vị`,
      }),
    );
  });

  socket.on("notification", (data: NotificationPayload) => {
    useSocketStore.getState().pushNotification(
      makeNotification({
        type: data.type,
        title: data.title,
        message: data.message,
      }),
    );
  });

  return socket;
}

function ensureConnected(url: string): Socket {
  if (!sharedSocket || sharedUrl !== url) {
    sharedSocket?.disconnect();
    sharedSocket = createSocket(url);
    sharedUrl = url;
    sharedSocket.connect();
  } else if (!sharedSocket.connected) {
    sharedSocket.connect();
  }
  return sharedSocket;
}

function attachSocket(url: string): Socket {
  socketRefCount += 1;
  return ensureConnected(url);
}

function detachSocket(url: string) {
  socketRefCount = Math.max(0, socketRefCount - 1);
  if (socketRefCount === 0 && sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
    sharedUrl = null;
  }
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseSocketReturn {
  status: SocketStatus;
  socket: Socket | null;
  draftCount: number;
  notifications: NotificationItem[];
  unreadCount: number;
  connect: () => void;
  disconnect: () => void;
  on: <T = unknown>(event: string, handler: (data: T) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { url = SOCKET_URL, autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);

  const status = useSocketStore((s) => s.status);
  const draftCount = useSocketStore((s) => s.draftCount);
  const notifications = useSocketStore((s) => s.notifications);
  const unreadCount = useSocketStore((s) => s.unreadCount);

  // Auto-connect + đếm tham chiếu để chỉ disconnect khi không còn ai dùng
  useEffect(() => {
    if (!autoConnect) return;
    socketRef.current = attachSocket(url);
    return () => {
      detachSocket(url);
      socketRef.current = null;
    };
  }, [url, autoConnect]);

  // ── Manual connect/disconnect ──
  const connect = useCallback(() => {
    socketRef.current = ensureConnected(url);
  }, [url]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  // ── Event helpers ──
  const on = useCallback(
    <T = unknown>(event: string, handler: (data: T) => void) => {
      (socketRef.current ?? ensureConnected(url)).on(
        event,
        handler as (...args: unknown[]) => void,
      );
    },
    [url],
  );

  const off = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      (socketRef.current ?? ensureConnected(url)).off(event, handler);
    },
    [url],
  );

  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      (socketRef.current ?? ensureConnected(url)).emit(event, ...args);
    },
    [url],
  );

  return {
    status,
    socket: socketRef.current,
    draftCount,
    notifications,
    unreadCount,
    connect,
    disconnect,
    on,
    off,
    emit,
  };
}
