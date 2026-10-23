"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { ChartWrapper } from "@/components/shared/ChartWrapper";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import ExportButton, {
  type ExportSection,
} from "@/components/shared/ExportButton";
import {
  useDebtSummary,
  useMonthlyComparison,
  useRevenueByCategory,
  useRevenueStations,
  useTopProducts,
} from "@/hooks/useReports";
import type { ReportDebtSummary } from "@/lib/report-keys";
import {
  formatCompact,
  formatCurrency,
  fmtFullDate,
  formatDateTime,
  toISODate,
  type ReportRange,
  type RevenueBucket,
} from "@/lib/report-utils";
import type { CategoryRevenueRow, MonthlyComparison } from "@/lib/report-keys";
import { useToast, ToastViewport } from "@/components/ui/toast";
import { useOrderList, getOrderCode } from "@/hooks/useOrders";
import OrderDetailDialog from "../orders/_components/OrderDetailDialog";
import DateRangeSelector from "./_components/DateRangeSelector";
import RevenueOverview from "./_components/RevenueOverview";
import ReportOrderHistory from "./_components/ReportOrderHistory";

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortName(name: string, max = 22): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

const PIE_COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#6366f1",
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
} as const;

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("month");
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [customTo, setCustomTo] = useState(() => toISODate(new Date()));

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeStation, setActiveStation] = useState<RevenueBucket | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const { stations, granularity, resolved, isLoading } = useRevenueStations(
    range,
    customFrom,
    customTo,
  );
  const topProducts = useTopProducts(10);
  const category = useRevenueByCategory();
  const debt = useDebtSummary();
  const monthly = useMonthlyComparison();

  const reportOrdersQuery = useOrderList({
    fromDate: toISODate(resolved.from),
    toDate: toISODate(resolved.to),
    page: 1,
    limit: 200,
  });
  const reportOrders = useMemo(
    () => reportOrdersQuery.data?.items ?? [],
    [reportOrdersQuery.data?.items],
  );

  const revenueSnapshotRef = useRef<(() => string | null) | null>(null);

  const rangeLabel = useMemo(
    () => `${fmtFullDate(toISODate(resolved.from))} → ${fmtFullDate(toISODate(resolved.to))}`,
    [resolved],
  );

  const handleRangeChange = (val: ReportRange) => {
    setRange(val);
    setActiveStation(null);
  };

  const handleCustomChange = (from: string, to: string) => {
    setCustomFrom(from);
    setCustomTo(to);
    setActiveStation(null);
  };

  const sections = useMemo<ExportSection[]>(() => {
    const list: ExportSection[] = [
      {
        title: "Doanh thu theo mốc",
        columns: ["Mốc", "Từ ngày", "Đến ngày", "Doanh thu (VND)", "Số đơn"],
        rows: stations.map((s) => [
          s.label,
          s.startDate,
          s.endDate,
          s.totalRevenue,
          s.orderCount,
        ]),
      },
    ];
    list.push({
      title: "Sản phẩm bán chạy (Top 10)",
      columns: ["Mã", "Sản phẩm", "Danh mục", "SL bán", "Doanh thu (VND)", "Số đơn"],
      rows: (topProducts.data ?? []).map((p) => [
        p.code,
        p.name,
        p.categoryName ?? "—",
        p.totalQuantitySold,
        p.totalRevenue,
        p.orderCount,
      ]),
    });
    list.push({
      title: "Doanh thu theo danh mục",
      columns: ["Danh mục", "Doanh thu (VND)"],
      rows: (category.data ?? []).map((c) => [c.categoryName, c.totalRevenue]),
    });
    if (debt.data) {
      list.push({
        title: "Công nợ",
        columns: ["Chỉ tiêu", "Giá trị (VND)"],
        rows: [
          ["Tổng nợ phát sinh", debt.data.totalDebt],
          ["Đã thu", debt.data.totalPaid],
          ["Nợ còn lại chưa thu", debt.data.totalRemaining],
          ["Nợ quá hạn (ước tính)", debt.data.overdueDebt],
          ["Số khách còn nợ", debt.data.customerCount],
        ],
      });
    }
    if (monthly.data) {
      list.push({
        title: "So sánh doanh thu tháng",
        columns: ["Kỳ", "Doanh thu (VND)"],
        rows: [
          [monthly.data.previous.label, monthly.data.previous.revenue],
          [monthly.data.current.label, monthly.data.current.revenue],
        ],
      });
    }
    if (reportOrders.length > 0) {
      list.push({
        title: "Lịch sử đơn hàng trong kỳ",
        columns: [
          "Mã đơn",
          "Thời gian tạo",
          "Khách hàng",
          "Số lượng SP",
          "Phương thức",
          "Tổng tiền (VND)",
          "Nợ (VND)",
          "Trạng thái",
        ],
        rows: reportOrders.map((o) => [
          getOrderCode(o),
          formatDateTime(o.createdAt),
          o.customerName || "Khách lẻ",
          (o.items ?? []).reduce((s, it) => s + it.quantity, 0),
          o.paymentMethod === "stripe"
            ? "Stripe"
            : o.paymentMethod === "qr_code"
              ? "VietQR"
              : o.paymentMethod === "debt"
                ? "Ghi nợ"
                : "Tiền mặt",
          o.finalAmount,
          o.debtAmount,
          o.status === "confirmed"
            ? "Đã xác nhận"
            : o.status === "draft"
              ? "Nháp"
              : "Đã hủy",
        ]),
      });
    }
    return list;
  }, [stations, topProducts.data, category.data, debt.data, monthly.data, reportOrders]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Báo cáo kinh doanh
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng hợp doanh thu, sản phẩm, danh mục & công nợ ·{" "}
            <span className="font-medium">{rangeLabel}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <DateRangeSelector
            value={range}
            customFrom={customFrom}
            customTo={customTo}
            onValueChange={handleRangeChange}
            onCustomChange={handleCustomChange}
          />
          <ExportButton
            title="Báo cáo kinh doanh BizFlow 3D"
            subtitle={`Kỳ báo cáo: ${rangeLabel}`}
            filename={`bao-cao-${toISODate(resolved.from)}-${toISODate(resolved.to)}`}
            sections={sections}
            getSnapshot={() => revenueSnapshotRef.current?.() ?? null}
          />
        </div>
      </motion.div>

      {/* ── Charts grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* a. Revenue Overview (2D line / 3D timeline theo is3DEnabled) */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <RevenueOverview
            stations={stations}
            granularity={granularity}
            rangeLabel={rangeLabel}
            isLoading={isLoading}
            snapshotRef={revenueSnapshotRef}
            onSelectStation={(st) => setActiveStation(st)}
            onSelectOrder={(id) => {
              setSelectedOrderId(id);
              setDetailOpen(true);
            }}
          />
        </motion.div>

        {/* d. Debt Overview */}
        <motion.div variants={itemVariants}>
          <DebtOverviewCard data={debt.data} isLoading={debt.isLoading} />
        </motion.div>

        {/* b. Top Selling Products */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <TopProductsChart
            data={topProducts.data ?? []}
            isLoading={topProducts.isLoading}
          />
        </motion.div>

        {/* c. Revenue by Category */}
        <motion.div variants={itemVariants}>
          <RevenueByCategoryChart
            data={category.data ?? []}
            isLoading={category.isLoading}
          />
        </motion.div>

        {/* e. Monthly Comparison */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <MonthlyComparisonCard
            data={monthly.data}
            isLoading={monthly.isLoading}
          />
        </motion.div>

        {/* f. Lịch sử đơn hàng trong kỳ */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <ReportOrderHistory
            fromDate={toISODate(resolved.from)}
            toDate={toISODate(resolved.to)}
            rangeLabel={rangeLabel}
            activeStation={activeStation}
            onClearStation={() => setActiveStation(null)}
            onSelectOrder={(id) => {
              setSelectedOrderId(id);
              setDetailOpen(true);
            }}
          />
        </motion.div>
      </div>

      {/* ── Detail dialog ── */}
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orderId={selectedOrderId}
        showToast={showToast}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}

// ── d. Debt Overview ──────────────────────────────────────────────────────────

function DebtOverviewCard({
  data,
  isLoading,
}: {
  data: ReportDebtSummary | undefined;
  isLoading: boolean;
}) {
  return (
    <Card className="h-full border-border/50 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">Tổng quan công nợ</CardTitle>
        <CardDescription>Nợ phát sinh & nợ quá hạn</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DebtStat
          icon={Wallet}
          label="Tổng nợ phát sinh"
          value={formatCurrency(data?.totalDebt ?? 0)}
          color="blue"
          loading={isLoading}
          sub={`Đã thu ${formatCurrency(data?.totalPaid ?? 0)}`}
        />
        <DebtStat
          icon={AlertTriangle}
          label="Nợ quá hạn (ước tính)"
          value={formatCurrency(data?.overdueDebt ?? 0)}
          color="red"
          loading={isLoading}
          sub={`Còn lại chưa thu · ${data?.customerCount ?? 0} khách`}
        />
      </CardContent>
    </Card>
  );
}

function DebtStat({
  icon: Icon,
  label,
  value,
  color,
  loading,
  sub,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  color: "blue" | "red";
  loading: boolean;
  sub?: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  }[color];

  return (
    <div className="rounded-xl border bg-background/40 p-4">
      <div className="flex items-center gap-2.5">
        <span className={`rounded-lg p-2 ${tones}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── b. Top Selling Products (2D bar chart) ────────────────────────────────────

function TopProductsChart({
  data,
  isLoading,
}: {
  data: Array<{
    productId: string;
    code: string;
    name: string;
    categoryName: string | null;
    totalQuantitySold: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  isLoading: boolean;
}) {
  const chartData = data.map((p) => ({ ...p, displayName: shortName(p.name) }));
  return (
    <ChartWrapper
      title="Sản phẩm bán chạy"
      subtitle="Top 10 theo số lượng bán ra"
      height={360}
      isLoading={isLoading}
      isEmpty={!isLoading && chartData.length === 0}
      action={
        <Badge variant="secondary" className="gap-1 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
          <BarChart3 className="h-3 w-3" />
          {chartData.length} sản phẩm
        </Badge>
      }
    >
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
      >
        <defs>
          <linearGradient id="tpBarGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="displayName"
          width={158}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
          content={
            <ChartTooltip
              name="Đã bán:"
              labelFormatter={(label) => shortName(String(label), 26)}
              valueFormatter={(value) => value.toLocaleString("vi-VN")}
              footer={(row) => ({
                label: "Doanh thu:",
                value: formatCurrency(Number(row.totalRevenue) || 0),
              })}
            />
          }
        />
        <Bar dataKey="totalQuantitySold" fill="url(#tpBarGrad)" radius={[0, 6, 6, 0]} barSize={15} />
      </BarChart>
    </ChartWrapper>
  );
}

// ── c. Revenue by Category (2D pie chart) ─────────────────────────────────────

function RevenueByCategoryChart({
  data,
  isLoading,
}: {
  data: CategoryRevenueRow[];
  isLoading: boolean;
}) {
  return (
    <ChartWrapper
      title="Doanh thu theo danh mục"
      subtitle="Tỷ trọng doanh thu từng danh mục"
      height={360}
      isLoading={isLoading}
      isEmpty={!isLoading && data.length === 0}
      action={
        <Badge variant="secondary" className="gap-1 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
          <PieChartIcon className="h-3 w-3" />
          {data.length} danh mục
        </Badge>
      }
    >
      <PieChart>
        <Pie
          data={data}
          dataKey="totalRevenue"
          nameKey="categoryName"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((c, i) => (
            <Cell key={c.categoryName} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          content={
            <ChartTooltip
              name="Doanh thu"
              valueFormatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => shortName(String(label), 24)}
            />
          }
        />
      </PieChart>
    </ChartWrapper>
  );
}

// ── e. Monthly Comparison ─────────────────────────────────────────────────────

function MonthlyComparisonCard({
  data,
  isLoading,
}: {
  data: MonthlyComparison | undefined;
  isLoading: boolean;
}) {
  const change = data?.changePct ?? 0;
  const up = change >= 0;

  return (
    <Card className="h-full border-border/50 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-base">So sánh doanh thu tháng</CardTitle>
        <CardDescription>Tháng này so với tháng trước</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1.4fr] md:items-center">
          {/* Tháng trước */}
          <MonthBlock
            label={data?.previous.label ?? "Tháng trước"}
            value={data?.previous.revenue ?? 0}
            loading={isLoading}
            muted
          />
          <div className="hidden text-2xl font-bold text-muted-foreground/60 md:block">
            →
          </div>

          {/* Tháng này */}
          <MonthBlock
            label={data?.current.label ?? "Tháng này"}
            value={data?.current.revenue ?? 0}
            loading={isLoading}
            highlight
          />
          <div className="hidden md:block">
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <Badge
                variant="secondary"
                className={`gap-1 ${
                  up
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {up ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {up ? "+" : ""}
                {change.toFixed(1)}%
              </Badge>
            )}
          </div>

          {/* Biểu đồ so sánh 2 cột */}
          <div className="h-[120px] w-full">
            {isLoading || !data ? (
              <div className="flex h-full items-end gap-8 px-6">
                <Skeleton className="h-16 w-full max-w-[90px]" />
                <Skeleton className="h-24 w-full max-w-[110px]" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: data.previous.label, revenue: data.previous.revenue },
                    { name: data.current.label, revenue: data.current.revenue },
                  ]}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(100, 116, 139, 0.2)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(100, 116, 139, 0.08)" }}
                    content={
                      <ChartTooltip
                        name="Doanh thu"
                        valueFormatter={(value) => formatCurrency(value)}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[6, 6, 0, 0]}
                    fill={up ? "#10b981" : "#ef4444"}
                    barSize={46}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthBlock({
  label,
  value,
  loading,
  muted = false,
  highlight = false,
}: {
  label: string;
  value: number;
  loading: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
          : muted
            ? "border-border/60 bg-background/40"
            : "border-border/60 bg-background/40"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-36" />
      ) : (
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
          {formatCompact(value)}
        </p>
      )}
      <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(value)}</p>
    </div>
  );
}
