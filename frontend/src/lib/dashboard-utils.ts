// ── Dashboard date & normalization helpers (pure, dùng chung server + client) ──

import type { DailyRevenuePoint } from "./dashboard-keys";

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
