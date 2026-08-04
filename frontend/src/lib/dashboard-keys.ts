// ── Dashboard shared types & query keys ──────────────────────────────────────
// Module dùng chung giữa SSR prefetch (server component) và client hooks.
// KHÔNG chứa directive "use client" để cả server lẫn client đều import được.

export interface DailyRevenuePoint {
  /** Ngày dạng yyyy-MM-dd */
  date: string;
  totalRevenue: number;
  orderCount: number;
}

export interface TopProductRow {
  productId: string;
  code: string;
  name: string;
  categoryName: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
}

export interface RecentOrder {
  id: string;
  orderCode: string;
  customerId: string | null;
  customerName: string;
  itemsSummary: string;
  finalAmount: number;
  debtAmount: number;
  status: "confirmed" | "draft" | "cancelled";
  createdAt: string;
}

export interface LowStockItem {
  productId: string;
  productName: string | null;
  totalQuantity: number;
}

export interface DebtSummary {
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
  customerCount: number;
}

/** Số lượng tồn tối đa để được coi là "sắp hết hàng" */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Ngưỡng nợ cảnh báo (đơn vị VND) — khối 3D "chồng thùng nợ" chuyển màu đỏ
 * khi tổng nợ vượt ngưỡng. Giá trị cấu hình hệ thống, mặc định 20 triệu.
 */
export const DEBT_ALERT_THRESHOLD = 20_000_000;

/** Query keys cho toàn bộ widget dashboard — dùng chung server & client */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  revenue: ["dashboard", "revenue"] as const,
  topProducts: ["dashboard", "top-products"] as const,
  recentOrders: ["dashboard", "recent-orders"] as const,
  lowStock: ["dashboard", "low-stock"] as const,
  totalDebt: ["dashboard", "total-debt"] as const,
  pendingDrafts: ["dashboard", "pending-drafts"] as const,
} as const;
