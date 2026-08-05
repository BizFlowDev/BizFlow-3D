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
  mockPeriodTransactions,
  mockRevenueForRange,
  pickGranularity,
  toISODate,
  type ReportRange,
  type ResolvedRange,
  type RevenueBucket,
  type TimelineGranularity,
} from "@/lib/report-utils";

// ── Mock Data (fallback khi API chưa sẵn sàng) ───────────────────────────────

const MOCK_TOP_PRODUCTS: TopProductRow[] = [
  { productId: "p1", code: "SP-001", name: "Xi măng Hà Tiên PCB40", categoryName: "Vật liệu xây dựng", totalQuantitySold: 128, totalRevenue: 25600000, orderCount: 42 },
  { productId: "p2", code: "SP-002", name: "Gạch ống 8 lỗ", categoryName: "Vật liệu xây dựng", totalQuantitySold: 980, totalRevenue: 19600000, orderCount: 38 },
  { productId: "p3", code: "SP-003", name: "Sắt phi 10", categoryName: "Thép xây dựng", totalQuantitySold: 450, totalRevenue: 17100000, orderCount: 25 },
  { productId: "p4", code: "SP-004", name: "Sơn nước Dulux (18L)", categoryName: "Sơn", totalQuantitySold: 36, totalRevenue: 8640000, orderCount: 21 },
  { productId: "p5", code: "SP-005", name: "Cát xây dựng (m³)", categoryName: "Vật liệu xây dựng", totalQuantitySold: 42, totalRevenue: 6300000, orderCount: 19 },
  { productId: "p6", code: "SP-006", name: "Dây điện Cadivi 2.5", categoryName: "Điện & thiết bị", totalQuantitySold: 60, totalRevenue: 5400000, orderCount: 16 },
  { productId: "p7", code: "SP-007", name: "Đinh thép 5cm", categoryName: "Vật tư", totalQuantitySold: 320, totalRevenue: 3840000, orderCount: 14 },
  { productId: "p8", code: "SP-008", name: "Keo dán gạch (25kg)", categoryName: "Vật liệu xây dựng", totalQuantitySold: 28, totalRevenue: 3360000, orderCount: 11 },
  { productId: "p9", code: "SP-009", name: "Ống nhựa PVC 27", categoryName: "Vật tư", totalQuantitySold: 95, totalRevenue: 2850000, orderCount: 9 },
  { productId: "p10", code: "SP-010", name: "Bóng đèn LED 20W", categoryName: "Điện & thiết bị", totalQuantitySold: 120, totalRevenue: 2400000, orderCount: 12 },
];

const MOCK_CATEGORY_REVENUE: CategoryRevenueRow[] = [
  { categoryName: "Vật liệu xây dựng", totalRevenue: 54800000 },
  { categoryName: "Thép xây dựng", totalRevenue: 17100000 },
  { categoryName: "Sơn", totalRevenue: 8640000 },
  { categoryName: "Điện & thiết bị", totalRevenue: 7800000 },
  { categoryName: "Vật tư", totalRevenue: 6690000 },
];

const MOCK_DEBT: ReportDebtSummary = {
  totalDebt: 38900000,
  totalPaid: 22400000,
  totalRemaining: 16500000,
  customerCount: 12,
  overdueDebt: 8400000,
};

const MOCK_MONTHLY: MonthlyComparison = {
  current: { label: "Tháng 8/2026", revenue: 128400000 },
  previous: { label: "Tháng 7/2026", revenue: 114200000 },
  changePct: 12.4,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * - API thật: GET /reports/daily-revenue?fromDate&toDate
 * - Fallback: mock sinh xác định theo ngày.
 */
export function useDailyRevenue(from: Date, to: Date) {
  const fromKey = from.toISOString();
  const toKey = to.toISOString();
  return useQuery({
    queryKey: reportKeys.dailyRevenue(from.toISOString(), to.toISOString()),
    queryFn: async (): Promise<DailyRevenuePoint[]> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<DailyRevenuePoint[]>>(
          "/reports/daily-revenue",
          { params: { fromDate: fromKey, toDate: toKey } },
        );
        if (data.data) return fillRevenueRange(from, to, data.data);
      } catch {
        // fallback mock
      }
      await delay(350);
      return mockRevenueForRange(from, to);
    },
    staleTime: 60_000,
  });
}

/**
 * Tính các "trạm" cho Dòng thời gian 3D (gộp ngày/tuần/tháng theo range).
 * Tách riêng khỏi useQuery để cùng dữ liệu daily-revenue phục vụ cả 2D lẫn 3D.
 * Stations được memo hoá theo [points, granularity, from, to] — reference ổn
 * định giữa các render để widget 3D không bị reset scroll vô cớ.
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

/** Top sản phẩm bán chạy (bar chart 2D) — mặc định top 10 */
export function useTopProducts(limit = 10) {
  return useQuery({
    queryKey: reportKeys.topProducts(limit),
    queryFn: async (): Promise<TopProductRow[]> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<TopProductRow[]>>(
          "/reports/top-products",
          { params: { limit } },
        );
        if (data.data) return data.data;
      } catch {
        // fallback mock
      }
      await delay(350);
      return MOCK_TOP_PRODUCTS.slice(0, limit);
    },
    staleTime: 60_000,
  });
}

/**
 * Doanh thu theo danh mục (pie chart 2D).
 * - API thật: thử GET /reports/revenue-by-category (chưa có) → nếu thiếu thì
 *   suy ra từ top-products (gộp theo categoryName) để có dữ liệu thật.
 * - Fallback cuối: mock.
 */
export function useRevenueByCategory() {
  return useQuery({
    queryKey: reportKeys.revenueByCategory,
    queryFn: async (): Promise<CategoryRevenueRow[]> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<CategoryRevenueRow[]>>(
          "/reports/revenue-by-category",
        );
        if (data.data && data.data.length) return data.data;
      } catch {
        // fallback
      }
      try {
        const { data } = await apiClient.get<ApiResponseData<TopProductRow[]>>(
          "/reports/top-products",
          { params: { limit: 50 } },
        );
        const rows = data.data;
        if (rows && rows.length) {
          const map = new Map<string, number>();
          for (const p of rows) {
            const key = p.categoryName || "Khác";
            map.set(key, (map.get(key) ?? 0) + p.totalRevenue);
          }
          return [...map.entries()]
            .map(([categoryName, totalRevenue]) => ({ categoryName, totalRevenue }))
            .sort((a, b) => b.totalRevenue - a.totalRevenue);
        }
      } catch {
        // fallback mock
      }
      await delay(350);
      return MOCK_CATEGORY_REVENUE;
    },
    staleTime: 60_000,
  });
}

/** Tổng nợ & nợ quá hạn (2 card) */
export function useDebtSummary() {
  return useQuery({
    queryKey: reportKeys.debtSummary,
    queryFn: async (): Promise<ReportDebtSummary> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<ReportDebtSummary>>(
          "/reports/debt-summary",
        );
        if (data.data) {
          const { totalDebt, totalPaid, totalRemaining, customerCount } = data.data;
          return {
            totalDebt,
            totalPaid,
            totalRemaining,
            customerCount,
            // Backend chưa cung cấp nợ quá hạn → ước tính toàn bộ nợ chưa thu
            overdueDebt: totalRemaining,
          };
        }
      } catch {
        // fallback mock
      }
      await delay(350);
      return MOCK_DEBT;
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
      try {
        const { data } = await apiClient.get<ApiResponseData<DailyRevenuePoint[]>>(
          "/reports/daily-revenue",
          {
            params: {
              fromDate: lastMonthStart.toISOString(),
              toDate: new Date().toISOString(),
            },
          },
        );
        if (data.data && data.data.length) {
          let currentRev = 0;
          let previousRev = 0;
          for (const row of data.data) {
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
        }
      } catch {
        // fallback mock
      }
      await delay(350);
      return MOCK_MONTHLY;
    },
    staleTime: 60_000,
  });
}

/**
 * Chi tiết giao dịch của một ngày/kỳ (Sheet khi click cột timeline).
 * API thật: GET /orders?fromDate&toDate&status=confirmed
 */
export function usePeriodTransactions(fromIso: string, toIso: string) {
  const enabled = Boolean(fromIso && toIso);
  return useQuery({
    queryKey: reportKeys.periodTransactions(fromIso, toIso),
    enabled,
    queryFn: async (): Promise<PeriodTransaction[]> => {
      try {
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
        if (data.data) return data.data.items.map(toPeriodTransaction);
      } catch {
        // fallback mock
      }
      await delay(300);
      return mockPeriodTransactions(fromIso, toIso);
    },
    staleTime: 60_000,
  });
}

// ── Re-export helpers để page dùng chung ─────────────────────────────────────

export { fmtFullDate, formatCurrency, formatDateTime, getRangeDates };
