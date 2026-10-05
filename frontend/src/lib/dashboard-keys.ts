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

export type DashboardRevenueRange = "today" | "7d" | "30d" | "month";

export interface RevenueComparisonPoint {
  /** Ngày của kỳ hiện tại (yyyy-MM-dd) */
  date: string;
  /** Nhãn hiển thị trục X (VD: 22/09) */
  label: string;
  /** Doanh thu kỳ này */
  currentRevenue: number;
  /** Số đơn hàng kỳ này */
  currentOrders: number;
  /** Ngày đối ứng của kỳ trước (yyyy-MM-dd) */
  prevDate: string;
  /** Nhãn hiển thị kỳ trước */
  prevLabel: string;
  /** Doanh thu cùng kỳ trước */
  previousRevenue: number;
  /** Số đơn hàng cùng kỳ trước */
  previousOrders: number;
}

export interface RevenueComparisonSummary {
  points: RevenueComparisonPoint[];
  totalCurrentRevenue: number;
  totalPreviousRevenue: number;
  totalCurrentOrders: number;
  totalPreviousOrders: number;
  growthPct: number;
  avgOrderValue: number;
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
  revenue: (range: string = "7d") => ["dashboard", "revenue", range] as const,
  revenueBase: ["dashboard", "revenue"] as const,
  revenueComparison: (range: string = "7d") =>
    ["dashboard", "revenue-comparison", range] as const,
  revenueComparisonBase: ["dashboard", "revenue-comparison"] as const,
  topProducts: ["dashboard", "top-products"] as const,
  recentOrders: ["dashboard", "recent-orders"] as const,
  lowStock: ["dashboard", "low-stock"] as const,
  totalDebt: ["dashboard", "total-debt"] as const,
};

