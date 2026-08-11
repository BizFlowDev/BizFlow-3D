"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  useSocket,
  formatVND,
  type NewDraftOrderPayload,
  type OrderConfirmedPayload,
  type NewOrderPayload,
  type LowStockAlertPayload,
} from "@/hooks/useSocket";

/**
 * Lắng nghe toàn bộ sự kiện realtime từ socketServer và phản hồi bằng toast.
 * Đặt trong dashboard layout để chạy xuyên suốt phiên đăng nhập.
 *
 * - new_draft_order → toast (bỏ qua khi đang ở trang AI Orders để tránh trùng)
 * - order_confirmed / new_order → toast + refresh danh sách đơn
 * - low_stock_alert → toast + refresh badge tồn kho
 * - notification → chuông thông báo (header) xử lý, không toast ở đây
 */
export function SocketProvider() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { on, off } = useSocket();
  const { toasts, showToast, dismiss } = useToast();

  const isOnAiOrdersPage = pathname?.startsWith("/ai-orders") ?? false;

  useEffect(() => {
    const handleNewDraft = (data: NewDraftOrderPayload) => {
      if (isOnAiOrdersPage) return; // trang AI Orders đã tự toast + thêm card
      showToast(
        "info",
        "Đơn nháp mới",
        `Đơn nháp ${data.draftOrderId} · ${data.itemCount} mặt hàng · ${formatVND(data.totalAmount)}${data.customerName ? ` · ${data.customerName}` : ""}`,
      );
    };

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

    on("new_draft_order", handleNewDraft);
    on("order_confirmed", handleOrderConfirmed);
    on("new_order", handleNewOrder);
    on("low_stock_alert", handleLowStock);

    return () => {
      off("new_draft_order", handleNewDraft as (...args: unknown[]) => void);
      off("order_confirmed", handleOrderConfirmed as (...args: unknown[]) => void);
      off("new_order", handleNewOrder as (...args: unknown[]) => void);
      off("low_stock_alert", handleLowStock as (...args: unknown[]) => void);
    };
  }, [on, off, isOnAiOrdersPage, showToast, queryClient]);

  return <ToastViewport toasts={toasts} onDismiss={dismiss} />;
}
