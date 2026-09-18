// ── Báo cáo: date range, phân cụm mốc thời gian & mock data ──────────────────
// Module thuần (pure) — dùng chung cho page, hooks và widget 3D. KHÔNG chứa
// directive "use client".

import type { DailyRevenuePoint } from "./dashboard-keys";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportRange =
  | "today"
  | "yesterday"
  | "week"
  | "last_week"
  | "month"
  | "last_month"
  | "quarter"
  | "last_quarter"
  | "year"
  | "last_year"
  | "all"
  | "custom";

export type TimelineGranularity = "day" | "week" | "month";

/**
 * Một "trạm" trên Dòng thời gian 3D.
 * - Nguồn dữ liệu: GET /reports/daily-revenue (từng ngày) → gộp theo
 *   ngày/tuần/tháng tuỳ khoảng thời gian đang chọn trong DateRangeSelector.
 * - startDate/endDate dùng để query chi tiết giao dịch khi click cột.
 */
export interface RevenueBucket {
  key: string;
  label: string;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  totalRevenue: number;
  orderCount: number;
}

export interface CategoryRevenueRow {
  categoryName: string;
  totalRevenue: number;
}

export interface MonthlyComparison {
  current: { label: string; revenue: number };
  previous: { label: string; revenue: number };
  changePct: number;
}

export interface PeriodTransaction {
  id: string;
  orderCode: string;
  customerName: string;
  itemCount: number;
  finalAmount: number;
  debtAmount: number;
  createdAt: string;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

/** dd/MM */
export function fmtShortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** dd/MM/yyyy */
export function fmtFullDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ── Range ─────────────────────────────────────────────────────────────────────

export interface ResolvedRange {
  from: Date;
  to: Date;
}

/**
 * Tính from/to theo preset DateRangeSelector.
 * Preset "tuần/tháng/quý/năm" luôn cắt về ngày hiện tại (không đưa ngày
 * tương lai vào báo cáo) — tránh các cột 0đ vô nghĩa trên timeline.
 */
export function getRangeDates(
  range: ReportRange,
  customFrom: string,
  customTo: string,
): ResolvedRange {
  const today = new Date();
  let from = startOfDay(today);
  const to = endOfDay(today);

  switch (range) {
    case "today":
      break;
    case "yesterday": {
      const y = addDays(today, -1);
      from = startOfDay(y);
      to.setTime(endOfDay(y).getTime());
      break;
    }
    case "week": {
      const day = (today.getDay() + 6) % 7; // Thứ 2 = 0
      from = startOfDay(addDays(today, -day));
      break;
    }
    case "last_week": {
      const day = (today.getDay() + 6) % 7; // Thứ 2 = 0
      from = startOfDay(addDays(today, -day - 7));
      to.setTime(endOfDay(addDays(today, -day - 1)).getTime());
      break;
    }
    case "month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_month": {
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to.setTime(endOfDay(new Date(today.getFullYear(), today.getMonth(), 0)).getTime());
      break;
    }
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), q * 3, 1);
      break;
    }
    case "last_quarter": {
      const currentQ = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), (currentQ - 1) * 3, 1);
      to.setTime(endOfDay(new Date(today.getFullYear(), currentQ * 3, 0)).getTime());
      break;
    }
    case "year":
      from = new Date(today.getFullYear(), 0, 1);
      break;
    case "last_year": {
      from = new Date(today.getFullYear() - 1, 0, 1);
      to.setTime(endOfDay(new Date(today.getFullYear() - 1, 11, 31)).getTime());
      break;
    }
    case "all": {
      from = new Date(2020, 0, 1);
      break;
    }
    case "custom": {
      if (customFrom && customTo) {
        from = startOfDay(fromISODate(customFrom));
        to.setTime(endOfDay(fromISODate(customTo)).getTime());
      } else {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      break;
    }
  }

  return { from, to };
}

export function daysBetween(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  for (
    let d = startOfDay(from);
    d.getTime() <= endOfDay(to).getTime();
    d = addDays(d, 1)
  ) {
    out.push(startOfDay(d));
  }
  return out;
}

/** Điền đủ các ngày trong khoảng — ngày thiếu dữ liệu gán 0 */
export function fillRevenueRange(
  from: Date,
  to: Date,
  rows: DailyRevenuePoint[],
): DailyRevenuePoint[] {
  const map = new Map(rows.map((r) => [r.date, r]));
  return daysBetween(from, to).map((d) => {
    const key = toISODate(d);
    return map.get(key) ?? { date: key, totalRevenue: 0, orderCount: 0 };
  });
}

// ── Granularity (ngày/tuần/tháng theo range đang chọn) ───────────────────────

export function pickGranularity(
  range: ReportRange,
  numDays: number,
): TimelineGranularity {
  switch (range) {
    case "year":
    case "last_year":
      return "month";
    case "quarter":
    case "last_quarter":
      return "week";
    case "today":
    case "yesterday":
    case "week":
    case "last_week":
    case "month":
    case "last_month":
      return "day";
    case "all":
    case "custom":
      if (numDays <= 62) return "day";
      if (numDays <= 185) return "week";
      return "month";
    default:
      return "day";
  }
}

/** Tuần ISO (năm + tuần) — dùng làm key gộp theo tuần */
export function isoWeekKey(date: string): string {
  const d = fromISODate(date);
  const day = (d.getDay() + 6) % 7;
  const iso = new Date(d);
  iso.setDate(d.getDate() - day + 3);
  const yearThursday = new Date(iso.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((iso.getTime() - yearThursday.getTime()) / 864e5 -
        3 +
        ((yearThursday.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-${week}`;
}

/**
 * Gộp dữ liệu doanh thu theo ngày/tuần/tháng thành các "trạm" cho timeline.
 * `rangeEnd` dùng để kẹp ngày cuối của trạm tuần (không vượt quá báo cáo).
 */
export function buildRevenueStations(
  points: DailyRevenuePoint[],
  granularity: TimelineGranularity,
  rangeEnd: Date,
): RevenueBucket[] {
  if (granularity === "day") {
    return points.map((p) => ({
      key: p.date,
      label: fmtShortDate(p.date),
      startDate: p.date,
      endDate: p.date,
      totalRevenue: p.totalRevenue,
      orderCount: p.orderCount,
    }));
  }

  const map = new Map<
    string,
    { start: Date; end: Date; revenue: number; count: number }
  >();

  for (const p of points) {
    const d = fromISODate(p.date);
    let start: Date;
    let end: Date;

    if (granularity === "week") {
      const day = (d.getDay() + 6) % 7; // Thứ 2 = 0
      start = startOfDay(addDays(d, -day));
      end = endOfDay(addDays(start, 6));
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), 1);
      end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }

    // Kẹp không vượt quá ngày kết thúc báo cáo
    if (end.getTime() > endOfDay(rangeEnd).getTime()) end = endOfDay(rangeEnd);

    const key = toISODate(start);
    const existing = map.get(key);
    if (existing) {
      existing.revenue += p.totalRevenue;
      existing.count += p.orderCount;
    } else {
      map.set(key, { start, end, revenue: p.totalRevenue, count: p.orderCount });
    }
  }

  const sorted = [...map.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return sorted.map(([key, v]) => ({
    key,
    label:
      granularity === "week"
        ? `Tuần ${fmtShortDate(toISODate(v.start))}`
        : `Tháng ${Number(key.slice(5, 7))}/${key.slice(0, 4)}`,
    startDate: toISODate(v.start),
    endDate: toISODate(v.end),
    totalRevenue: v.revenue,
    orderCount: v.count,
  }));
}

// ── Mock doanh thu (fallback khi API chưa sẵn sàng) ──────────────────────────
// Sinh dữ liệu xác định (deterministic) từ chuỗi ngày → visual ổn định,
// không nhảy số mỗi lần render.

export function mockRevenueForRange(
  from: Date,
  to: Date,
): DailyRevenuePoint[] {
  const out: DailyRevenuePoint[] = [];
  for (
    let d = startOfDay(from);
    d.getTime() <= endOfDay(to).getTime();
    d = addDays(d, 1)
  ) {
    const iso = toISODate(d);
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const base = weekend ? 16_500_000 : 11_200_000;

    let h = 0;
    for (let i = 0; i < iso.length; i++) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
    const noise = (h % 1000) / 1000; // 0..1

    const revenue = Math.max(800_000, Math.round(base + (noise - 0.5) * 7_200_000));
    out.push({
      date: iso,
      totalRevenue: revenue,
      orderCount: Math.max(1, Math.round(revenue / 1_350_000)),
    });
  }
  return out;
}

/** Mock giao dịch của một ngày/kỳ (fallback khi không kết nối được backend) */
export function mockPeriodTransactions(
  fromIso: string,
  toIso: string,
): PeriodTransaction[] {
  const from = fromISODate(fromIso);
  const to = fromISODate(toIso);
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5) + 1);
  const customers = [
    "Nguyễn Văn An",
    "Lê Hoàng Cường",
    "Trần Thị Bích",
    "Phạm Minh Tuấn",
    "Hoàng Thị Nga",
    "Đặng Quốc Bảo",
    "Khách lẻ",
    "Võ Văn Tùng",
  ];
  const count = spanDays <= 1 ? 6 : Math.min(14, 4 + spanDays);
  const rows: PeriodTransaction[] = [];

  for (let i = 0; i < count; i++) {
    const day = addDays(from, i % spanDays);
    const hour = 8 + (i % 10);
    const minute = (i * 13) % 60;
    const created = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute);
    const dateStr = `${created.getFullYear()}${String(created.getMonth() + 1).padStart(2, "0")}${String(created.getDate()).padStart(2, "0")}`;
    const itemCount = 1 + ((i * 3) % 6);
    const finalAmount = 250_000 + ((i * 37 + 1) * 173_000) % 6_500_000;
    const hasDebt = i % 4 === 1;
    rows.push({
      id: `mock-tx-${fromIso}-${i}`,
      orderCode: `DH-${dateStr}-${String(i + 1).padStart(3, "0")}`,
      customerName: customers[i % customers.length],
      itemCount,
      finalAmount,
      debtAmount: hasDebt ? Math.round(finalAmount * 0.7) : 0,
      createdAt: created.toISOString(),
    });
  }

  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
