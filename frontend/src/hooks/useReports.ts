"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";
import { reportKeys } from "@/lib/report-keys";
import type {
  CategoryRevenueRow,
  MonthlyComparison,
  PeriodTransaction,
  ReportDebtSummary,
} from "@/lib/report-keys";
import type { DailyRevenuePoint, TopProductRow } from "@/lib/dashboard-keys";
import {
  buildRevenueStations,
  fillRevenueRange,
  fmtFullDate,
  formatCurrency,
  formatDateTime,
  getRangeDates,
  pickGranularity,
  toISODate,
  type ReportRange,
  type ResolvedRange,
  type RevenueBucket,
  type TimelineGranularity,
} from "@/lib/report-utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RawOrder {
  id: string;
  customerId: string | null;
  status: "confirmed" | "draft" | "cancelled";
  finalAmount: number;
  debtAmount: number;
  note: string | null;
  createdAt: string;
  items?: { id: string; productId: string; quantity: number }[];
}

function toPeriodTransaction(order: RawOrder, index: number): PeriodTransaction {
  const date = new Date(order.createdAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return {
    id: order.id,
    orderCode: `DH-${dateStr}-${String(index + 1).padStart(3, "0")}`,
    customerName: order.customerId ? `#${order.customerId.slice(0, 8)}` : "Khách lẻ",
    itemCount: order.items?.length ?? 0,
    finalAmount: order.finalAmount,
    debtAmount: order.debtAmount,
    createdAt: order.createdAt,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Doanh thu từng ngày trong khoảng [from, to].
 * API: GET /reports/daily-revenue?fromDate&toDate
 */
export function useDailyRevenue(from: Date, to: Date) {
  const fromKey = from.toISOString();
  const toKey = to.toISOString();
  return useQuery({
    queryKey: reportKeys.dailyRevenue(from.toISOString(), to.toISOString()),
    queryFn: async (): Promise<DailyRevenuePoint[]> => {
      const { data } = await apiClient.get<ApiResponseData<DailyRevenuePoint[]>>(
        "/reports/daily-revenue",
        { params: { fromDate: fromKey, toDate: toKey } },
      );
      return fillRevenueRange(from, to, data.data ?? []);
    },
    staleTime: 60_000,
  });
}

/**
 * Tính các "trạm" cho Dòng thời gian 3D (gộp ngày/tuần/tháng theo range).
 */
export function useRevenueStations(
  range: ReportRange,
  customFrom: string,
  customTo: string,
): {
  stations: RevenueBucket[];
  granularity: TimelineGranularity;
  resolved: ResolvedRange;
  isLoading: boolean;
} {
  const resolved = getRangeDates(range, customFrom, customTo);
  const { data, isLoading } = useDailyRevenue(resolved.from, resolved.to);
  const points = data ?? [];
  const fromIso = toISODate(resolved.from);
  const toIso = toISODate(resolved.to);
  const numDays = Math.max(
    1,
    Math.round((new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / 864e5) + 1,
  );
  const granularity = pickGranularity(range, numDays);

  const stations = useMemo(
    () => buildRevenueStations(points, granularity, new Date(`${toIso}T23:59:59`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, granularity, fromIso, toIso],
  );
  return { stations, granularity, resolved, isLoading };
}

/** Top sản phẩm bán chạy — mặc định top 10 */
export function useTopProducts(limit = 10) {
  return useQuery({
    queryKey: reportKeys.topProducts(limit),
    queryFn: async (): Promise<TopProductRow[]> => {
      const { data } = await apiClient.get<ApiResponseData<TopProductRow[]>>(
        "/reports/top-products",
        { params: { limit } },
      );
      return data.data ?? [];
    },
    staleTime: 60_000,
  });
}

/** Doanh thu theo danh mục (pie chart) */
export function useRevenueByCategory() {
  return useQuery({
    queryKey: reportKeys.revenueByCategory,
    queryFn: async (): Promise<CategoryRevenueRow[]> => {
      const { data } = await apiClient.get<ApiResponseData<CategoryRevenueRow[]>>(
        "/reports/revenue-by-category",
      );
      return data.data ?? [];
    },
    staleTime: 60_000,
  });
}

/** Tổng nợ & nợ quá hạn */
export function useDebtSummary() {
  return useQuery({
    queryKey: reportKeys.debtSummary,
    queryFn: async (): Promise<ReportDebtSummary> => {
      const { data } = await apiClient.get<ApiResponseData<ReportDebtSummary>>(
        "/reports/debt-summary",
      );
      const result = data.data!;
      return {
        totalDebt: result.totalDebt,
        totalPaid: result.totalPaid,
        totalRemaining: result.totalRemaining,
        customerCount: result.customerCount,
        // Backend chưa cung cấp nợ quá hạn → ước tính = nợ còn lại chưa thu
        overdueDebt: result.totalRemaining,
      };
    },
    staleTime: 60_000,
  });
}

/** So sánh doanh thu tháng này vs tháng trước (tính từ daily-revenue) */
export function useMonthlyComparison() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  return useQuery({
    queryKey: reportKeys.monthlyComparison(thisMonth),
    queryFn: async (): Promise<MonthlyComparison> => {
      const { data } = await apiClient.get<ApiResponseData<DailyRevenuePoint[]>>(
        "/reports/daily-revenue",
        {
          params: {
            fromDate: lastMonthStart.toISOString(),
            toDate: new Date().toISOString(),
          },
        },
      );
      const rows = data.data ?? [];
      let currentRev = 0;
      let previousRev = 0;
      for (const row of rows) {
        if (row.date.startsWith(thisMonth)) currentRev += row.totalRevenue;
        else previousRev += row.totalRevenue;
      }
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const changePct =
        previousRev > 0
          ? ((currentRev - previousRev) / previousRev) * 100
          : currentRev > 0
            ? 100
            : 0;
      return {
        current: {
          label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
          revenue: currentRev,
        },
        previous: {
          label: `Tháng ${previous.getMonth() + 1}/${previous.getFullYear()}`,
          revenue: previousRev,
        },
        changePct,
      };
    },
    staleTime: 60_000,
  });
}

/**
 * Chi tiết giao dịch của một ngày/kỳ (Sheet khi click cột timeline).
 * API: GET /orders?fromDate&toDate&status=confirmed
 */
export function usePeriodTransactions(fromIso: string, toIso: string) {
  const enabled = Boolean(fromIso && toIso);
  return useQuery({
    queryKey: reportKeys.periodTransactions(fromIso, toIso),
    enabled,
    queryFn: async (): Promise<PeriodTransaction[]> => {
      const { data } = await apiClient.get<
        ApiResponseData<{ items: RawOrder[] }>
      >("/orders", {
        params: {
          fromDate: `${fromIso}T00:00:00`,
          toDate: `${toIso}T23:59:59`,
          status: "confirmed",
          limit: 200,
        },
      });
      return (data.data?.items ?? []).map(toPeriodTransaction);
    },
    staleTime: 60_000,
  });
}

// ── Re-export helpers để page dùng chung ─────────────────────────────────────

export { fmtFullDate, formatCurrency, formatDateTime, getRangeDates };
