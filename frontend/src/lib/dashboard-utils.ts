// ── Dashboard date & normalization helpers (pure, dùng chung server + client) ──

import type {
  DailyRevenuePoint,
  DashboardRevenueRange,
  RevenueComparisonPoint,
  RevenueComparisonSummary,
} from "./dashboard-keys";

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

/** Ngày dạng yyyy-MM-dd theo giờ địa phương */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatShortDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  }
  return dateStr;
}

export interface DateRange {
  fromDate: Date;
  toDate: Date;
  days: Date[];
}

/** Lấy n ngày gần nhất (từ hôm nay lùi lại), fromDate là đầu ngày đầu, toDate là cuối ngày hôm nay */
export function lastNDays(n: number): DateRange {
  const today = startOfDay(new Date());
  const fromDate = addDays(today, -(n - 1));
  const days = Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
  return { fromDate, toDate: endOfDay(today), days };
}

/** Điền đủ 7 ngày, ngày thiếu dữ liệu sẽ gán 0 (đảm bảo biểu đồ luôn đủ 7 điểm) */
export function fillRevenueDays(rows: DailyRevenuePoint[]): DailyRevenuePoint[] {
  const { days } = lastNDays(7);
  const map = new Map(rows.map((r) => [r.date, r]));
  return days.map((d) => {
    const key = toISODate(d);
    return map.get(key) ?? { date: key, totalRevenue: 0, orderCount: 0 };
  });
}

export interface ComparisonRangeResult {
  fetchFromDate: Date;
  fetchToDate: Date;
  currentDays: Date[];
  previousDays: Date[];
  rangeLabel: string;
}

export function getDashboardRangeDates(
  range: DashboardRevenueRange,
): ComparisonRangeResult {
  const today = startOfDay(new Date());
  const now = endOfDay(today);

  if (range === "today") {
    const yesterday = addDays(today, -1);
    return {
      fetchFromDate: yesterday,
      fetchToDate: now,
      currentDays: [today],
      previousDays: [yesterday],
      rangeLabel: "Hôm nay vs Hôm qua",
    };
  }

  if (range === "7d") {
    const curStart = addDays(today, -6);
    const prevStart = addDays(today, -13);

    const currentDays = Array.from({ length: 7 }, (_, i) =>
      addDays(curStart, i),
    );
    const previousDays = Array.from({ length: 7 }, (_, i) =>
      addDays(prevStart, i),
    );

    return {
      fetchFromDate: prevStart,
      fetchToDate: now,
      currentDays,
      previousDays,
      rangeLabel: "7 ngày qua vs 7 ngày trước",
    };
  }

  if (range === "30d") {
    const curStart = addDays(today, -29);
    const prevStart = addDays(today, -59);

    const currentDays = Array.from({ length: 30 }, (_, i) =>
      addDays(curStart, i),
    );
    const previousDays = Array.from({ length: 30 }, (_, i) =>
      addDays(prevStart, i),
    );

    return {
      fetchFromDate: prevStart,
      fetchToDate: now,
      currentDays,
      previousDays,
      rangeLabel: "30 ngày qua vs 30 ngày trước",
    };
  }

  // range === "month": từ mùng 1 tháng này đến hôm nay, so sánh với cùng các ngày tháng trước
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfMonth = today.getDate();

  const currentDays: Date[] = [];
  for (let d = 1; d <= dayOfMonth; d++) {
    currentDays.push(new Date(year, month, d));
  }

  const prevMonthDate = new Date(year, month - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  const previousDays: Date[] = [];
  for (let d = 1; d <= dayOfMonth; d++) {
    const safeDay = Math.min(d, daysInPrevMonth);
    previousDays.push(new Date(prevYear, prevMonth, safeDay));
  }

  const fetchFromDate = startOfDay(new Date(prevYear, prevMonth, 1));

  return {
    fetchFromDate,
    fetchToDate: now,
    currentDays,
    previousDays,
    rangeLabel: `Tháng ${month + 1} vs Tháng ${prevMonth + 1}`,
  };
}

export function buildRevenueComparisonSeries(
  rows: DailyRevenuePoint[],
  currentDays: Date[],
  previousDays: Date[],
): RevenueComparisonSummary {
  const map = new Map<string, DailyRevenuePoint>();
  for (const r of rows) {
    map.set(r.date, r);
  }

  let totalCurrentRevenue = 0;
  let totalPreviousRevenue = 0;
  let totalCurrentOrders = 0;
  let totalPreviousOrders = 0;

  const points: RevenueComparisonPoint[] = currentDays.map((curD, i) => {
    const curKey = toISODate(curD);
    const curPoint = map.get(curKey) ?? {
      date: curKey,
      totalRevenue: 0,
      orderCount: 0,
    };

    const prevD = previousDays[i];
    const prevKey = prevD ? toISODate(prevD) : "";
    const prevPoint =
      prevKey && map.get(prevKey)
        ? map.get(prevKey)!
        : { date: prevKey, totalRevenue: 0, orderCount: 0 };

    totalCurrentRevenue += curPoint.totalRevenue;
    totalPreviousRevenue += prevPoint.totalRevenue;
    totalCurrentOrders += curPoint.orderCount;
    totalPreviousOrders += prevPoint.orderCount;

    return {
      date: curKey,
      label: formatShortDate(curKey),
      currentRevenue: curPoint.totalRevenue,
      currentOrders: curPoint.orderCount,
      prevDate: prevKey,
      prevLabel: prevKey ? formatShortDate(prevKey) : "",
      previousRevenue: prevPoint.totalRevenue,
      previousOrders: prevPoint.orderCount,
    };
  });

  const growthPct =
    totalPreviousRevenue > 0
      ? ((totalCurrentRevenue - totalPreviousRevenue) / totalPreviousRevenue) * 100
      : totalCurrentRevenue > 0
        ? 100
        : 0;

  const avgOrderValue =
    totalCurrentOrders > 0
      ? Math.round(totalCurrentRevenue / totalCurrentOrders)
      : 0;

  return {
    points,
    totalCurrentRevenue,
    totalPreviousRevenue,
    totalCurrentOrders,
    totalPreviousOrders,
    growthPct,
    avgOrderValue,
  };
}

