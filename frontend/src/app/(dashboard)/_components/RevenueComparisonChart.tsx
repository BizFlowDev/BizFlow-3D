"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChartWrapper } from "@/components/shared/ChartWrapper";
import { useRevenueComparison } from "@/hooks/useDashboard";
import type {
  DailyRevenuePoint,
  DashboardRevenueRange,
  RevenueComparisonPoint,
} from "@/lib/dashboard-keys";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatFullDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface ComparisonTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    payload: RevenueComparisonPoint;
  }>;
}

function ComparisonTooltip({ active, payload }: ComparisonTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const currentRev = data.currentRevenue ?? 0;
  const prevRev = data.previousRevenue ?? 0;
  const diff = currentRev - prevRev;
  const diffPct =
    prevRev > 0 ? (diff / prevRev) * 100 : currentRev > 0 ? 100 : 0;
  const isUp = diff >= 0;

  return (
    <div className="z-50 min-w-[220px] rounded-xl border border-border/80 bg-background/95 p-3 shadow-xl shadow-black/10 backdrop-blur-md">
      {/* Header ngày */}
      <div className="mb-2 border-b border-border/50 pb-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Calendar className="h-3.5 w-3.5 text-blue-500" />
          {formatFullDate(data.date)}
          {data.prevDate && (
            <span className="text-muted-foreground font-normal">
              (đối ứng: {formatFullDate(data.prevDate)})
            </span>
          )}
        </p>
      </div>

      {/* Thông số kỳ này */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
            <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
            Kỳ này:
          </span>
          <div className="text-right">
            <span className="font-bold tabular-nums text-foreground">
              {formatCurrency(currentRev)}
            </span>
            <span className="ml-1 text-[11px] text-muted-foreground">
              ({data.currentOrders} đơn)
            </span>
          </div>
        </div>

        {/* Thông số cùng kỳ trước */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full border border-dashed border-slate-400 bg-slate-200 dark:bg-slate-700" />
            Kỳ trước:
          </span>
          <div className="text-right">
            <span className="font-semibold tabular-nums text-muted-foreground">
              {formatCurrency(prevRev)}
            </span>
            <span className="ml-1 text-[11px] text-muted-foreground">
              ({data.previousOrders} đơn)
            </span>
          </div>
        </div>

        {/* Chênh lệch */}
        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-1.5 font-medium">
          <span className="text-muted-foreground">Tăng trưởng:</span>
          <span
            className={`flex items-center gap-0.5 font-semibold tabular-nums ${
              isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {diff >= 0 ? "+" : ""}
            {diffPct.toFixed(1)}% ({formatCompact(Math.abs(diff))})
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Props & Component ─────────────────────────────────────────────────────────

interface RevenueComparisonChartProps {
  is3D?: boolean;
  render3D?: React.ReactNode;
  fallbackDailyPoints?: DailyRevenuePoint[];
}

export function RevenueComparisonChart({
  is3D,
  render3D,
}: RevenueComparisonChartProps) {
  const [range, setRange] = useState<DashboardRevenueRange>("7d");
  const { data, isLoading } = useRevenueComparison(range);

  const points = data?.points ?? [];
  const totalRev = data?.totalCurrentRevenue ?? 0;
  const growthPct = data?.growthPct ?? 0;
  const avgOrderVal = data?.avgOrderValue ?? 0;
  const totalOrders = data?.totalCurrentOrders ?? 0;
  const isPositiveGrowth = growthPct >= 0;

  const rangeDescriptions: Record<DashboardRevenueRange, string> = {
    today: "Doanh thu hôm nay so với hôm qua",
    "7d": "Doanh thu 7 ngày gần nhất so với 7 ngày trước",
    "30d": "Doanh thu 30 ngày gần nhất so với 30 ngày trước",
    month: "Doanh thu tháng này so với cùng kỳ tháng trước",
  };

  return (
    <ChartWrapper
      title="Biểu đồ doanh thu"
      subtitle={rangeDescriptions[range]}
      height={310}
      noResponsiveContainer={true}
      isLoading={isLoading}
      isEmpty={!isLoading && points.length === 0}
      render3D={is3D ? render3D : undefined}
      action={
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!is3D && (
            <Tabs
              value={range}
              onValueChange={(v) => setRange(v as DashboardRevenueRange)}
            >
              <TabsList className="h-8 bg-muted/70 p-0.5">
                <TabsTrigger value="7d" className="px-2.5 text-xs">
                  7 ngày
                </TabsTrigger>
                <TabsTrigger value="30d" className="px-2.5 text-xs">
                  30 ngày
                </TabsTrigger>
                <TabsTrigger value="month" className="px-2.5 text-xs">
                  Tháng này
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Badge tổng doanh thu & tăng trưởng */}
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="gap-1 font-semibold text-xs bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
            >
              {formatCurrency(totalRev)}
            </Badge>
            <Badge
              variant="secondary"
              className={`gap-1 font-semibold text-xs ${
                isPositiveGrowth
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
              }`}
            >
              {isPositiveGrowth ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositiveGrowth ? "+" : ""}
              {growthPct.toFixed(1)}%
            </Badge>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full w-full justify-between">
        <div className="h-[255px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
            >
            <defs>
              <linearGradient id="revenueCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="revenueStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(100, 116, 139, 0.18)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <Tooltip
              cursor={{
                stroke: "rgba(100, 116, 139, 0.3)",
                strokeDasharray: "4 4",
              }}
              content={<ComparisonTooltip />}
            />
            {/* Đường nét đứt kỳ trước */}
            <Line
              type="monotone"
              dataKey="previousRevenue"
              name="Kỳ trước"
              stroke="#94a3b8"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, stroke: "#94a3b8", strokeWidth: 1.5 }}
            />
            {/* Vùng diện tích kỳ này */}
            <Area
              type="monotone"
              dataKey="currentRevenue"
              name="Kỳ này"
              stroke="url(#revenueStrokeGrad)"
              strokeWidth={3}
              fill="url(#revenueCurrentGrad)"
              dot={{ r: 3.5, fill: "#2563eb", strokeWidth: 1, stroke: "#fff" }}
              activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2, fill: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

        {/* Chú thích & Tóm tắt chỉ số phụ */}
        <div className="mt-1 flex flex-wrap items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
              Kỳ này ({totalOrders} đơn)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
              Cùng kỳ trước
            </span>
          </div>
          {avgOrderVal > 0 && (
            <div>
              Giá trị TB/đơn (AOV):{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(avgOrderVal)}
              </span>
            </div>
          )}
        </div>
      </div>
    </ChartWrapper>
  );
}
