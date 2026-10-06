// ── SSR prefetch cho Dashboard ────────────────────────────────────────────────
// Chỉ chạy trên server (Next.js Server Component). Đọc token từ cookie và gọi
// trực tiếp backend bằng fetch, ghi kết quả vào QueryClient để dehydrate.
// Nếu thiếu token hoặc API lỗi → bỏ qua, client hook sẽ tự fetch khi mount.

import { cookies } from "next/headers";
import type { QueryClient } from "@tanstack/react-query";
import {
  dashboardKeys,
  LOW_STOCK_THRESHOLD,
  type DailyRevenuePoint,
  type DebtSummary,
  type LowStockItem,
  type RecentOrder,
  type TopProductRow,
} from "./dashboard-keys";
import {
  fillRevenueDays,
  getDashboardRangeDates,
  buildRevenueComparisonSeries,
} from "./dashboard-utils";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
const REVENUE_RANGE_DAYS = 7;
const ORDERS_LIMIT = 5;
const TOP_PRODUCTS_LIMIT = 5;

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RawOrder {
  id: string;
  storeId: string;
  customerId: string | null;
  userId: string | null;
  orderType: string;
  status: "confirmed" | "draft" | "cancelled";
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  debtAmount: number;
  note: string | null;
  createdByAi: boolean;
  createdAt: string;
  updatedAt: string;
  items?: { id: string; productId: string; quantity: number }[];
}

async function apiGet<T>(
  path: string,
  token: string,
  params?: Record<string, string | number>,
): Promise<T> {
  const base = API_BASE.endsWith("/") ? API_BASE : `${API_BASE}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);

  const json = (await res.json()) as {
    success: boolean;
    message: string;
    data?: T;
  };
  return json.data as T;
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

/**
 * Prefetch toàn bộ dữ liệu dashboard cho QueryClient hiện tại (SSR).
 * Mỗi widget được đặt dữ liệu riêng theo dashboardKeys tương ứng.
 */
export async function prefetchDashboard(queryClient: QueryClient): Promise<void> {
  const store = await cookies();
  const token = store.get("bizflow.accessToken")?.value ?? null;
  if (!token) return;

  // a/b/g. Revenue today + orders today + 7-day comparison chart
  try {
    const { fetchFromDate, fetchToDate, currentDays, previousDays } =
      getDashboardRangeDates("7d");
    const rows = await apiGet<DailyRevenuePoint[]>("/reports/daily-revenue", token, {
      fromDate: fetchFromDate.toISOString(),
      toDate: fetchToDate.toISOString(),
    });
    // Điền 7 ngày gần nhất cho useRevenueData (thống kê hôm nay, hôm qua, và 3D chart)
    queryClient.setQueryData(dashboardKeys.revenue("7d"), fillRevenueDays(rows));
    // Dữ liệu so sánh 7 ngày qua vs 7 ngày trước cho useRevenueComparison (2D chart)
    queryClient.setQueryData(
      dashboardKeys.revenueComparison("7d"),
      buildRevenueComparisonSeries(rows, currentDays, previousDays),
    );
  } catch {
    // Bỏ qua — client sẽ tự fetch
  }

  // h. Top products (GET /reports/top-products?limit=5)
  try {
    const rows = await apiGet<TopProductRow[]>("/reports/top-products", token, {
      limit: TOP_PRODUCTS_LIMIT,
    });
    queryClient.setQueryData(dashboardKeys.topProducts, rows);
  } catch {
    // ignore
  }

  // f. Recent orders (GET /orders?limit=5)
  try {
    const page = await apiGet<Paginated<RawOrder>>("/orders", token, {
      limit: ORDERS_LIMIT,
    });
    queryClient.setQueryData(
      dashboardKeys.recentOrders,
      page.items.map(toRecentOrder),
    );
  } catch {
    // ignore
  }

  // e. Low stock alert (GET /inventory/stock — filter sản phẩm sắp hết hàng)
  try {
    const rows = await apiGet<LowStockItem[]>("/inventory/stock", token);
    queryClient.setQueryData(
      dashboardKeys.lowStock,
      rows.filter((r) => r.totalQuantity <= LOW_STOCK_THRESHOLD),
    );
  } catch {
    // ignore
  }

  // d. Total debt (GET /reports/debt-summary)
  try {
    const summary = await apiGet<DebtSummary>("/reports/debt-summary", token);
    queryClient.setQueryData(dashboardKeys.totalDebt, summary);
  } catch {
    // ignore
  }
}
