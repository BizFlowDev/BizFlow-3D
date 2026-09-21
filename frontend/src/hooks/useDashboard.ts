"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";
import {
  dashboardKeys,
  LOW_STOCK_THRESHOLD,
  type DailyRevenuePoint,
  type DebtSummary,
  type LowStockItem,
  type RecentOrder,
  type TopProductRow,
} from "@/lib/dashboard-keys";
import {
  fillRevenueDays,
  lastNDays,
  getDashboardRangeDates,
  buildRevenueComparisonSeries,
} from "@/lib/dashboard-utils";
import type {
  DashboardRevenueRange,
  RevenueComparisonSummary,
} from "@/lib/dashboard-keys";

// ── Mock Data (fallback khi API chưa sẵn sàng) ───────────────────────────────

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateMockRevenuePoints(from: Date, to: Date): DailyRevenuePoint[] {
  const result: DailyRevenuePoint[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const seed = (cur.getDate() * 17 + (cur.getMonth() + 1) * 31) % 100;
    const baseRev = 8_000_000 + seed * 150_000;
    const orderCount = 5 + Math.floor(seed / 8);
    result.push({
      date: dateStr,
      totalRevenue: baseRev,
      orderCount,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

const MOCK_REVENUE: DailyRevenuePoint[] = [
  { date: isoDaysAgo(6), totalRevenue: 12500000, orderCount: 9 },
  { date: isoDaysAgo(5), totalRevenue: 9800000, orderCount: 7 },
  { date: isoDaysAgo(4), totalRevenue: 15200000, orderCount: 11 },
  { date: isoDaysAgo(3), totalRevenue: 13800000, orderCount: 10 },
  { date: isoDaysAgo(2), totalRevenue: 11100000, orderCount: 8 },
  { date: isoDaysAgo(1), totalRevenue: 16800000, orderCount: 12 },
  { date: isoDaysAgo(0), totalRevenue: 19200000, orderCount: 14 },
];

const MOCK_TOP_PRODUCTS: TopProductRow[] = [
  { productId: "p1", code: "SP-001", name: "Xi măng Hà Tiên PCB40", categoryName: "Vật liệu xây dựng", totalQuantitySold: 128, totalRevenue: 25600000, orderCount: 42 },
  { productId: "p2", code: "SP-002", name: "Gạch ống 8 lỗ", categoryName: "Vật liệu xây dựng", totalQuantitySold: 980, totalRevenue: 19600000, orderCount: 38 },
  { productId: "p3", code: "SP-003", name: "Sắt phi 10", categoryName: "Thép xây dựng", totalQuantitySold: 450, totalRevenue: 17100000, orderCount: 25 },
  { productId: "p4", code: "SP-004", name: "Sơn nước Dulux (18L)", categoryName: "Sơn", totalQuantitySold: 36, totalRevenue: 8640000, orderCount: 21 },
  { productId: "p5", code: "SP-005", name: "Cát xây dựng (m³)", categoryName: "Vật liệu xây dựng", totalQuantitySold: 42, totalRevenue: 6300000, orderCount: 19 },
];

const MOCK_RECENT_ORDERS: RecentOrder[] = [
  { id: "o101", orderCode: "DH-20260802-001", customerId: "c1", customerName: "Nguyễn Văn An", itemsSummary: "5 mặt hàng", finalAmount: 3700000, debtAmount: 0, status: "confirmed", createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: "o102", orderCode: "DH-20260802-002", customerId: "c3", customerName: "Lê Hoàng Cường", itemsSummary: "3 mặt hàng", finalAmount: 2480000, debtAmount: 2480000, status: "confirmed", createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() },
  { id: "o103", orderCode: "DH-20260802-003", customerId: null, customerName: "Khách lẻ", itemsSummary: "2 mặt hàng", finalAmount: 960000, debtAmount: 0, status: "confirmed", createdAt: new Date(Date.now() - 8 * 3600e3).toISOString() },
  { id: "o104", orderCode: "DH-20260802-004", customerId: "c8", customerName: "Bùi Thị Mai Linh", itemsSummary: "7 mặt hàng", finalAmount: 5400000, debtAmount: 0, status: "draft", createdAt: new Date(Date.now() - 26 * 3600e3).toISOString() },
  { id: "o105", orderCode: "DH-20260801-001", customerId: "c5", customerName: "Hoàng Thị Nga", itemsSummary: "4 mặt hàng", finalAmount: 1820000, debtAmount: 0, status: "confirmed", createdAt: new Date(Date.now() - 30 * 3600e3).toISOString() },
];

const MOCK_LOW_STOCK: LowStockItem[] = [
  { productId: "p6", productName: "Đinh thép 5cm", totalQuantity: 3 },
  { productId: "p7", productName: "Keo dán gạch (25kg)", totalQuantity: 8 },
  { productId: "p8", productName: "Dây điện Cadivi 2.5", totalQuantity: 10 },
];

const MOCK_DEBT_SUMMARY: DebtSummary = {
  totalDebt: 28900000,
  totalPaid: 12400000,
  totalRemaining: 16500000,
  customerCount: 12,
};

const MOCK_PENDING_DRAFTS = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Order entity thô từ backend */
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

function toRecentOrder(order: RawOrder, index: number): RecentOrder {
  const date = new Date(order.createdAt);
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const itemCount = order.items?.length ?? 0;
  return {
    id: order.id,
    orderCode: `DH-${dateStr}-${String(index + 1).padStart(3, "0")}`,
    customerId: order.customerId,
    customerName: order.customerId
      ? `#${order.customerId.slice(0, 8)}`
      : "Khách lẻ",
    itemsSummary:
      itemCount > 0 ? `${itemCount} mặt hàng` : order.note || "Đơn hàng",
    finalAmount: order.finalAmount,
    debtAmount: order.debtAmount,
    status: order.status,
    createdAt: order.createdAt,
  };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/**
 * Doanh thu 7 ngày gần nhất (dùng cho Revenue Today, Orders Today & fallback 3D chart).
 * Backend yêu cầu fromDate/toDate (không hỗ trợ range=today).
 */
export function useRevenueData() {
  return useQuery({
    queryKey: dashboardKeys.revenue("7d"),
    queryFn: async (): Promise<DailyRevenuePoint[]> => {
      try {
        const { fromDate, toDate } = lastNDays(7);
        const { data } = await apiClient.get<
          ApiResponseData<DailyRevenuePoint[]>
        >("/reports/daily-revenue", {
          params: {
            fromDate: fromDate.toISOString(),
            toDate: toDate.toISOString(),
          },
        });
        if (data.data) return fillRevenueDays(data.data);
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_REVENUE;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook phân tích doanh thu so sánh cùng kỳ (kỳ này vs kỳ trước) theo khoảng thời gian linh hoạt:
 * "today" | "7d" | "30d" | "month"
 */
export function useRevenueComparison(range: DashboardRevenueRange = "7d") {
  return useQuery({
    queryKey: dashboardKeys.revenue(range),
    queryFn: async (): Promise<RevenueComparisonSummary> => {
      const { fetchFromDate, fetchToDate, currentDays, previousDays } =
        getDashboardRangeDates(range);

      let rows: DailyRevenuePoint[] = [];
      try {
        const { data } = await apiClient.get<
          ApiResponseData<DailyRevenuePoint[]>
        >("/reports/daily-revenue", {
          params: {
            fromDate: fetchFromDate.toISOString(),
            toDate: fetchToDate.toISOString(),
          },
        });
        if (data.data && data.data.length > 0) {
          rows = data.data;
        }
      } catch {
        // Fallback mock
      }

      if (rows.length === 0) {
        await delay(300);
        rows = generateMockRevenuePoints(fetchFromDate, fetchToDate);
      }

      return buildRevenueComparisonSeries(rows, currentDays, previousDays);
    },
    staleTime: 60_000,
  });
}

/** Top 5 sản phẩm bán chạy nhất */
export function useTopProducts() {
  return useQuery({
    queryKey: dashboardKeys.topProducts,
    queryFn: async (): Promise<TopProductRow[]> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<TopProductRow[]>
        >("/reports/top-products", { params: { limit: 5 } });
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_TOP_PRODUCTS;
    },
    staleTime: 60_000,
  });
}

/** 5 đơn hàng gần nhất */
export function useRecentOrders() {
  return useQuery({
    queryKey: dashboardKeys.recentOrders,
    queryFn: async (): Promise<RecentOrder[]> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<{
            items: RawOrder[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
          }>
        >("/orders", { params: { limit: 5 } });
        if (data.data) return data.data.items.map(toRecentOrder);
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_RECENT_ORDERS;
    },
    staleTime: 60_000,
  });
}

/** Sản phẩm sắp hết hàng (tồn <= LOW_STOCK_THRESHOLD) */
export function useLowStockItems() {
  return useQuery({
    queryKey: dashboardKeys.lowStock,
    queryFn: async (): Promise<LowStockItem[]> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<LowStockItem[]>>(
          "/inventory/stock",
          { params: { low: true } },
        );
        if (data.data) {
          return data.data.filter(
            (item) => item.totalQuantity <= LOW_STOCK_THRESHOLD,
          );
        }
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_LOW_STOCK;
    },
    staleTime: 60_000,
  });
}

/** Tổng nợ chưa thu (GET /reports/debt-summary) */
export function useTotalDebt() {
  return useQuery({
    queryKey: dashboardKeys.totalDebt,
    queryFn: async (): Promise<DebtSummary> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<DebtSummary>>(
          "/reports/debt-summary",
        );
        if (data.data) return data.data;
      } catch {
        // Fallback mock
      }
      await delay(400);
      return MOCK_DEBT_SUMMARY;
    },
    staleTime: 60_000,
  });
}

/** Số đơn nháp (AI orders) đang chờ xử lý */
export function usePendingDrafts() {
  return useQuery({
    queryKey: dashboardKeys.pendingDrafts,
    queryFn: async (): Promise<number> => {
      try {
        const { data } = await apiClient.get<
          ApiResponseData<{ items: RawOrder[] }>
        >("/ai/draft-orders", { params: { status: "pending" } });
        if (data.data) return data.data.items.length;
      } catch {
        // Fallback: thử endpoint /ai-orders/drafts
        try {
          const { data } = await apiClient.get<
            ApiResponseData<{ items: RawOrder[] }>
          >("/ai-orders/drafts");
          if (data.data) return data.data.items.length;
        } catch {
          // Fallback mock
        }
      }
      await delay(400);
      return MOCK_PENDING_DRAFTS;
    },
    staleTime: 60_000,
  });
}
