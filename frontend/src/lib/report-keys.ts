// ── Báo cáo: query keys dùng chung server & client ───────────────────────────
// Module thuần, KHÔNG chứa directive "use client".

import type {
  CategoryRevenueRow,
  MonthlyComparison,
  PeriodTransaction,
} from "./report-utils";
import type { DailyRevenuePoint, TopProductRow } from "./dashboard-keys";

/** Mở rộng DebtSummary từ backend — thêm ước tính nợ quá hạn (backend chưa cung cấp). */
export interface ReportDebtSummary {
  totalDebt: number; // tổng nợ đã phát sinh
  totalPaid: number; // đã thu
  totalRemaining: number; // nợ còn lại chưa thu
  customerCount: number; // số khách còn nợ
  overdueDebt: number; // nợ quá hạn (ước tính)
}

export const reportKeys = {
  all: ["reports"] as const,
  dailyRevenue: (from: string, to: string) =>
    ["reports", "daily-revenue", from, to] as const,
  topProducts: (limit: number) => ["reports", "top-products", limit] as const,
  revenueByCategory: ["reports", "revenue-by-category"] as const,
  debtSummary: ["reports", "debt-summary"] as const,
  monthlyComparison: (month: string) =>
    ["reports", "monthly-comparison", month] as const,
  periodTransactions: (from: string, to: string) =>
    ["reports", "period-transactions", from, to] as const,
} as const;

export type {
  DailyRevenuePoint,
  TopProductRow,
  CategoryRevenueRow,
  MonthlyComparison,
  PeriodTransaction,
};
