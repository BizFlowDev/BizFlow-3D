"use client";

import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";
import apiClient, { type ApiResponseData } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SocketStatus = "connecting" | "connected" | "disconnected";

export interface UseSocketOptions {
  /** URL máy chủ Socket.io (mặc định lấy từ env hoặc localhost:3001) */
  url?: string;
  /** Tự động kết nối khi mount (mặc định true) */
  autoConnect?: boolean;
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
  notifications: NotificationItem[];
  unreadCount: number;
  /** Các id thông báo user đã xóa — giữ nguyên qua các lần fetch/đăng nhập */
  deletedIds: string[];
}

interface SocketEventActions {
  setStatus: (status: SocketStatus) => void;
  pushNotification: (item: NotificationItem) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  resetNotifications: () => void;
  mergeAnnouncements: (items: NotificationItem[]) => void;
}

// ── Persist notifications riêng theo từng user ────────────────────────────────
// Thông báo được giữ lại qua các lần đăng nhập (logout/login, refresh) cho tới
// khi người dùng chủ động xóa. Mỗi user có key localStorage riêng
// (bizflow.notifications.{userId}) nên các owner đọc/xóa KHÔNG ảnh hưởng nhau.

const DEFAULT_KEY = "bizflow.notifications.guest";
let activeNotificationKey: string | null = null;

/**
 * Kích hoạt phạm vi lưu thông báo đúng user hiện tại:
 * reset dữ liệu RAM cũ → đổi key persist → hydrate lại dữ liệu của user mới.
 */
function activateNotificationScope(uid: string): void {
  const key = `bizflow.notifications.${uid}`;
  if (activeNotificationKey === key) return;
  activeNotificationKey = key;
  useSocketStore.getState().resetNotifications();
  useSocketStore.persist.setOptions({ name: key });
  useSocketStore.persist.rehydrate();
}

/** Store dùng chung: cập nhật badge & notification bell khi nhận sự kiện realtime */
export const useSocketStore = create<SocketEventState & SocketEventActions>()(
  persist(
    (set) => ({
      status: "disconnected",
      notifications: [],
      unreadCount: 0,
      deletedIds: [],

      setStatus: (status) => set({ status }),
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
      clearNotifications: () =>
        set((s) => ({
          notifications: [],
          unreadCount: 0,
          // Nhớ id đã xóa để lần fetch sau không hiện lại
          deletedIds: [
            ...s.deletedIds,
            ...s.notifications.map((n) => n.id),
          ].slice(-200),
        })),
      removeNotification: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
          deletedIds: [...s.deletedIds, id].slice(-200),
        })),
      resetNotifications: () =>
        set({ notifications: [], unreadCount: 0, deletedIds: [] }),
      mergeAnnouncements: (items) =>
        set((s) => {
          const existingIds = new Set(s.notifications.map((n) => n.id));
          const deleted = new Set(s.deletedIds);
          const fresh = items.filter(
            (i) => !existingIds.has(i.id) && !deleted.has(i.id),
          );
          if (fresh.length === 0) return s;
          return {
            notifications: [...fresh, ...s.notifications].slice(0, 50),
            unreadCount: s.unreadCount + fresh.length,
          };
        }),
    }),
    {
      name: DEFAULT_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        notifications: s.notifications,
        unreadCount: s.unreadCount,
        deletedIds: s.deletedIds,
      }),
    },
  ),
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Thông báo broadcast từ backend (bảng announcements) */
interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

/**
 * Đồng bộ thông báo admin (announcements) từ server sau khi đăng nhập.
 * Đảm bảo owner không online lúc phát thông báo vẫn thấy khi đăng nhập lại,
 * và thông báo tồn tại cho tới khi user chủ động xóa.
 */
export async function syncAnnouncements(): Promise<void> {
  const user = useAuthStore.getState().user;
  if (!user) return;

  // Đảm bảo đang đọc/ghi đúng phạm vi lưu của user hiện tại
  activateNotificationScope(user.id);

  try {
    const res = await apiClient.get<ApiResponseData<AnnouncementRow[]>>(
      "/announcements",
    );
    const rows = res.data?.data ?? [];

    const items: NotificationItem[] = rows
      // Admin không nhận thông báo do chính mình phát hành
      .filter((r) => r.createdBy !== user.id)
      .map((r) => ({
        id: r.id,
        type: "announcement",
        title: r.title,
        message: r.content,
        createdAt: r.createdAt,
        read: false,
      }));

    useSocketStore.getState().mergeAnnouncements(items);
  } catch {
    // Lỗi mạng/token — bỏ qua, lần kết nối sau sẽ thử lại
  }
}

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

    // Đồng bộ announcements đã phát hành từ server (bù cho user online sau)
    void syncAnnouncements();
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
    notifications,
    unreadCount,
    connect,
    disconnect,
    on,
    off,
    emit,
  };
}
