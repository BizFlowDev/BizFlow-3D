"use client";

import { motion } from "motion/react";
import {
  Users,
  Store,
  CreditCard,
  TrendingUp,
  Crown,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  ShoppingCart,
  RefreshCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { usePlatformAnalytics } from "@/hooks/useAdmin";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toString();
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

// ── Animation variants ────────────────────────────────────────────────────────

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

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border bg-card/50 backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
        {/* Gradient accent */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.04]`}
        />
        <CardContent className="relative p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                {value}
              </p>
              {subtitle && (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div
              className={`rounded-xl bg-gradient-to-br ${gradient} p-3 shadow-lg`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          {trend && trendValue && (
            <div className="mt-3 flex items-center gap-1">
              {trend === "up" ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend === "up" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {trendValue}
              </span>
              <span className="text-xs text-muted-foreground">
                so với tháng trước
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  isCurrency?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  isCurrency = false,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-bold tabular-nums">
        {isCurrency
          ? formatCurrency(payload[0].value)
          : payload[0].value.toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: analytics, isLoading, refetch, isFetching } =
    usePlatformAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-[250px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-60 rounded-2xl" />
      </div>
    );
  }

  if (!analytics) return null;

  const registrationData = (analytics.newRegistrations ?? []).map((r) => ({
    ...r,
    label: formatMonth(r.date),
  }));

  const revenueData = (analytics.revenueOverTime ?? []).map((r) => ({
    ...r,
    label: formatMonth(r.date),
  }));

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
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Platform Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tổng quan hiệu suất toàn nền tảng BizFlow 3D.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng Users"
          value={(analytics.totalUsers ?? 0).toLocaleString("vi-VN")}
          subtitle="Tài khoản đã đăng ký"
          icon={Users}
          gradient="from-blue-500 to-blue-600"
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Tổng Stores"
          value={analytics.totalStores ?? 0}
          subtitle="Cửa hàng trên nền tảng"
          icon={Store}
          gradient="from-violet-500 to-purple-600"
          trend="up"
          trendValue="+1"
        />
        <StatCard
          title="Active Subscriptions"
          value={analytics.activeSubscriptions ?? 0}
          subtitle={`${
            analytics.totalStores
              ? Math.round(
                  ((analytics.activeSubscriptions ?? 0) /
                    analytics.totalStores) *
                    100
                )
              : 0
          }% stores đang hoạt động`}
          icon={CreditCard}
          gradient="from-emerald-500 to-teal-600"
          trend="up"
          trendValue="+2"
        />
        <StatCard
          title="MRR"
          value={formatCurrency(analytics.mrr ?? 0)}
          subtitle="Monthly Recurring Revenue"
          icon={TrendingUp}
          gradient="from-amber-500 to-orange-600"
          trend="up"
          trendValue="+9.2%"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Registrations Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-blue-500" />
                Đăng ký mới theo thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={registrationData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="count"
                    fill="url(#blueGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                  />
                  <defs>
                    <linearGradient
                      id="blueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Over Time Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Doanh thu nền tảng theo thời gian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatShortCurrency(value)}
                  />
                  <Tooltip content={<CustomTooltip isCurrency />} />
                  <defs>
                    <linearGradient
                      id="revenueGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="#10b981"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#revenueGradient)"
                    dot={{
                      fill: "#10b981",
                      strokeWidth: 2,
                      stroke: "white",
                      r: 4,
                    }}
                    activeDot={{
                      fill: "#10b981",
                      strokeWidth: 2,
                      stroke: "white",
                      r: 6,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Top Stores by Revenue ── */}
      <motion.div variants={itemVariants}>
        <Card className="border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Top cửa hàng theo doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead className="min-w-[250px]">Cửa hàng</TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      Gói
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      Đơn hàng
                    </TableHead>
                    <TableHead className="text-right min-w-[160px]">
                      Doanh thu
                    </TableHead>
                    <TableHead className="min-w-[120px]">
                      Tỷ trọng
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(analytics.topStores ?? []).map((store, index) => {
                    const maxRevenue = (analytics.topStores ?? [])[0]?.revenue ?? 1;
                    const percentage = (store.revenue / maxRevenue) * 100;
                    const PlanIcon =
                      store.plan === "professional" ? Crown : Zap;

                    return (
                      <motion.tr
                        key={store.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="border-b transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="text-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              index === 0
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md"
                                : index === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white"
                                : index === 2
                                ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {index + 1}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{store.name}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              store.plan === "professional"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                            }
                          >
                            <PlanIcon className="mr-1 h-3 w-3" />
                            {store.plan === "professional"
                              ? "Pro"
                              : "Basic"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                            {store.orders.toLocaleString("vi-VN")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(store.revenue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{
                                  duration: 0.8,
                                  delay: index * 0.1,
                                  ease: "easeOut",
                                }}
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                              />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground w-10 text-right tabular-nums">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
