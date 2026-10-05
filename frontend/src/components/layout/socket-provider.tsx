"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  useSocket,
  formatVND,
  type OrderConfirmedPayload,
  type NewOrderPayload,
  type LowStockAlertPayload,
} from "@/hooks/useSocket";

/**
 * Lắng nghe toàn bộ sự kiện realtime từ socketServer và phản hồi bằng toast.
 * Đặt trong dashboard layout để chạy xuyên suốt phiên đăng nhập.
 *
 * - order_confirmed / new_order → toast + refresh danh sách đơn
 * - low_stock_alert → toast + refresh badge tồn kho
 * - notification → chuông thông báo (header) xử lý, không toast ở đây
 */
export function SocketProvider() {
  const queryClient = useQueryClient();
  const { on, off } = useSocket();
  const { toasts, showToast, dismiss } = useToast();

  useEffect(() => {
    const handleOrderConfirmed = (data: OrderConfirmedPayload) => {
      showToast("success", "Đơn đã xác nhận", `Mã đơn ${data.orderCode}`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const handleNewOrder = (data: NewOrderPayload) => {
      showToast(
        "success",
        "Đơn hàng mới",
        `${data.customerName ?? "Khách lẻ"} · ${formatVND(data.totalAmount)}`,
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const handleLowStock = (data: LowStockAlertPayload) => {
      showToast(
        "error",
        "Cảnh báo tồn kho",
        `${data.productName} chỉ còn ${data.currentStock} đơn vị`,
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard", "low-stock"] });
    };

    on("order_confirmed", handleOrderConfirmed);
    on("new_order", handleNewOrder);
    on("low_stock_alert", handleLowStock);

    return () => {
      off("order_confirmed", handleOrderConfirmed as (...args: unknown[]) => void);
      off("new_order", handleNewOrder as (...args: unknown[]) => void);
      off("low_stock_alert", handleLowStock as (...args: unknown[]) => void);
    };
  }, [on, off, showToast, queryClient]);

  return <ToastViewport toasts={toasts} onDismiss={dismiss} />;
}
