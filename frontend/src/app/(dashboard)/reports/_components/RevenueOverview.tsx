"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartWrapper } from "@/components/shared/ChartWrapper";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";
import {
  formatCurrency,
  formatCompact,
  fmtFullDate,
  type RevenueBucket,
  type TimelineGranularity,
} from "@/lib/report-utils";
import PeriodTransactionsSheet from "./PeriodTransactionsSheet";

// Lazy-load scene 3D (three.js) — chỉ tải khi bật chế độ 3D
const RevenueTimeline3D = dynamic(
  () => import("./RevenueTimeline3D"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

interface RevenueOverviewProps {
  stations: RevenueBucket[];
  granularity: TimelineGranularity;
  rangeLabel: string;
  isLoading: boolean;
  /** Để ExportButton chụp snapshot Canvas khi đang ở chế độ 3D */
  snapshotRef: React.MutableRefObject<(() => string | null) | null>;
  onSelectStation?: (station: RevenueBucket) => void;
  onSelectOrder?: (orderId: string) => void;
}

/**
 * Widget a. "Tổng quan doanh thu" — đọc state is3DEnabled (uiPreferences):
 * - false → Line chart Recharts (2D thuần).
 * - true  → "Dòng thời gian 3D" (RevenueTimeline3D).
 * Mọi số liệu quan trọng vẫn hiển thị dạng text/bảng cạnh scene 3D.
 */
export default function RevenueOverview({
  stations,
  granularity,
  rangeLabel,
  isLoading,
  snapshotRef,
  onSelectStation,
  onSelectOrder,
}: RevenueOverviewProps) {
  const is3DEnabled = useUiPreferencesStore((state) => state.is3DEnabled);
  const [mounted, setMounted] = useState(false);
  const [selected2DStation, setSelected2DStation] = useState<RevenueBucket | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  // SSR luôn render 2D (tránh hydration mismatch); sau mount mới bật 3D
  const show3D = mounted && is3DEnabled;

  const chartData = stations.map((s) => ({
    label: s.label,
    date: s.startDate,
    totalRevenue: s.totalRevenue,
    orderCount: s.orderCount,
  }));
  const totalRevenue = stations.reduce((a, b) => a + b.totalRevenue, 0);

  return (
    <ChartWrapper
      title="Tổng quan doanh thu"
      subtitle={`Doanh thu theo mốc${
        granularity === "day" ? " ngày" : granularity === "week" ? " tuần" : " tháng"
      } · ${rangeLabel}`}
      height={360}
      isLoading={isLoading}
      isEmpty={!isLoading && stations.length === 0}
      action={
        <Badge
          variant="secondary"
          className="gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
        >
          {formatCurrency(totalRevenue)}
        </Badge>
      }
      render3D={
        show3D ? (
          <RevenueTimeline3D
            stations={stations}
            granularity={granularity}
            snapshotRef={snapshotRef}
            onSelectOrder={onSelectOrder}
          />
        ) : undefined
      }
    >
      <div className="relative h-full w-full">
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onClick={(state) => {
            if (state && state.activeLabel) {
              const found = stations.find((s) => s.label === state.activeLabel);
              if (found) {
                setSelected2DStation(found);
                onSelectStation?.(found);
              }
            }
          }}
        >
          <defs>
            <linearGradient id="repRevStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(100, 116, 139, 0.2)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatCompact}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: "rgba(100, 116, 139, 0.3)", strokeDasharray: "4 4" }}
            content={
              <ChartTooltip
                name="Doanh thu"
                labelFormatter={(label) => {
                  const station = stations.find((s) => s.label === String(label));
                  return station
                    ? station.startDate === station.endDate
                      ? fmtFullDate(station.startDate)
                      : station.label
                    : String(label);
                }}
                valueFormatter={(value) => formatCurrency(value)}
                footer={(row) => ({
                  label: "Số đơn (click để xem):",
                  value: String(Number(row.orderCount) || 0),
                })}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="totalRevenue"
            stroke="url(#repRevStroke)"
            strokeWidth={3}
            dot={{ r: 4, fill: "#2563eb", strokeWidth: 0, cursor: "pointer" }}
            activeDot={{ r: 7, cursor: "pointer" }}
          />
        </LineChart>

        {!show3D && (
          <PeriodTransactionsSheet
            station={selected2DStation}
            onClose={() => setSelected2DStation(null)}
            onSelectOrder={onSelectOrder}
          />
        )}
      </div>
    </ChartWrapper>
  );
}
