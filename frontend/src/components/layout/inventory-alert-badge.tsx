"use client";

import { useLowStockItems } from "@/hooks/useDashboard";

/**
 * Badge cảnh báo trên menu "Kho hàng" — hiện số sản phẩm sắp hết hàng.
 * Đọc chung dữ liệu /inventory/stock giống widget Dashboard (B9) để nhất quán.
 */
export function InventoryAlertBadge() {
  const { data: lowStock = [] } = useLowStockItems();

  if (lowStock.length === 0) return null;

  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white tabular-nums"
      aria-label={`${lowStock.length} sản phẩm sắp hết hàng`}
    >
      {lowStock.length}
    </span>
  );
}
