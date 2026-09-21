"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  Bot,
  RefreshCcw,
  CalendarDays,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/shared/StatCard";
import { dashboardKeys } from "@/lib/dashboard-keys";
import { useUiPreferencesStore } from "@/lib/stores/uiPreferences";
import { useToast, ToastViewport } from "@/components/ui/toast";
import OrderDetailDialog from "../orders/_components/OrderDetailDialog";
import TotalDebtWidget from "./TotalDebtWidget";
import LowStockWidget from "./LowStockWidget";
import { RevenueComparisonChart } from "./RevenueComparisonChart";
import { TopProductsWidget } from "./TopProductsWidget";
import {
  useRevenueData,
  useTopProducts,
  useRecentOrders,
  useLowStockItems,
  useTotalDebt,
  usePendingDrafts,
} from "@/hooks/useDashboard";

// Lazy-load scene 3D (three.js) — chỉ tải khi bật chế độ 3D (nguyên tắc hiệu suất)
const RevenueChart3D = dynamic(
  () => import("@/components/dashboard3d/RevenueChart3D"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);
const TopProducts3D = dynamic(
  () => import("@/components/dashboard3d/TopProducts3D"),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
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

// ── Order Status Badge ────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: "confirmed" | "draft" | "cancelled" }) {
  const config = {
    confirmed: {
      label: "Hoàn thành",
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    draft: {
      label: "Chờ xử lý",
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    },
    cancelled: {
      label: "Đã hủy",
      className:
        "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    },
  }[status];

  return (
    <Badge variant="secondary" className={`${config.className} hover:${config.className}`}>
      {config.label}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: dashboardKeys.all }) > 0;

  // ── Chế độ 3D ──
  const is3DEnabled = useUiPreferencesStore((state) => state.is3DEnabled);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // SSR render mặc định 2D (tránh hydration mismatch); sau mount mới bật 3D
  const is3D = mounted && is3DEnabled;

  // ── Queries ──
  const revenue = useRevenueData();
  const topProducts = useTopProducts();
  const recentOrders = useRecentOrders();
  const lowStock = useLowStockItems();
  const totalDebt = useTotalDebt();
  const pendingDrafts = usePendingDrafts();

  // ── Order detail dialog ──
  const { toasts, showToast, dismiss } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpenDetail = (order: { id: string }) => {
    setSelectedId(order.id);
    setDetailOpen(true);
  };

  // ── Derived stats ──
  const points = revenue.data ?? [];
  const todayPoint = points[points.length - 1];
  const yesterdayPoint = points[points.length - 2];
  const revenueToday = todayPoint?.totalRevenue ?? 0;
  const ordersToday = todayPoint?.orderCount ?? 0;
  const yesterdayRevenue = yesterdayPoint?.totalRevenue ?? 0;
  const yesterdayOrders = yesterdayPoint?.orderCount ?? 0;

  const revenueChange =
    yesterdayRevenue > 0
      ? ((revenueToday - yesterdayRevenue) / yesterdayRevenue) * 100
      : revenueToday > 0
        ? 100
        : 0;

  const ordersChange =
    yesterdayOrders > 0
      ? ((ordersToday - yesterdayOrders) / yesterdayOrders) * 100
      : ordersToday > 0
        ? 100
        : 0;

  const draftCount = pendingDrafts.data ?? 0;

  // ── Handlers ──
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  };

  const todayLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Tổng quan
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isFetching}
          aria-label="Tải lại dữ liệu"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          index={0}
          title="Doanh thu hôm nay"
          value={formatCurrency(revenueToday)}
          icon={DollarSign}
          color="blue"
          trend={{ value: revenueChange, label: "vs hôm qua" }}
          sub={`${ordersToday} đơn hôm nay`}
          loading={revenue.isLoading}
        />
        <StatCard
          index={1}
          title="Đơn hàng hôm nay"
          value={`${ordersToday}`}
          icon={ShoppingCart}
          color="emerald"
          trend={{ value: ordersChange, label: "vs hôm qua" }}
          sub="đơn hàng"
          loading={revenue.isLoading}
        />
        <StatCard
          index={2}
          title="Đơn nháp chờ xử lý"
          value={`${draftCount}`}
          icon={Bot}
          color="amber"
          sub="đơn nháp AI chờ duyệt"
          href="/ai-orders"
          loading={pendingDrafts.isLoading}
        />
        <TotalDebtWidget
          debtSummary={totalDebt.data}
          isLoading={totalDebt.isLoading}
        />
        <LowStockWidget
          lowStock={lowStock.data}
          isLoading={lowStock.isLoading}
        />
      </div>

      {/* ── Charts ── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-6 lg:grid-cols-3"
      >
        {/* Revenue Comparison Chart */}
        <div className="lg:col-span-2">
          <RevenueComparisonChart
            is3D={is3D}
            render3D={is3D ? <RevenueChart3D data={points} /> : undefined}
          />
        </div>

        {/* Top Products */}
        <div>
          <TopProductsWidget
            is3D={is3D}
            render3D={
              is3D ? <TopProducts3D data={topProducts.data ?? []} /> : undefined
            }
          />
        </div>
      </motion.div>

      {/* ── Recent Orders ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Đơn hàng gần đây
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              5 đơn hàng mới nhất
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">Xem tất cả</Link>
          </Button>
        </div>

        {recentOrders.isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (recentOrders.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <div className="rounded-full bg-muted p-4 mb-3">
              <Receipt className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[150px]">Đơn hàng</TableHead>
                  <TableHead className="min-w-[140px]">Khách hàng</TableHead>
                  <TableHead className="min-w-[110px]">Mặt hàng</TableHead>
                  <TableHead className="text-right min-w-[130px]">Tổng tiền</TableHead>
                  <TableHead className="text-right min-w-[110px]">Nợ</TableHead>
                  <TableHead className="text-center min-w-[100px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentOrders.data ?? []).map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => handleOpenDetail(order)}
                    className="group cursor-pointer border-b transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <span className="font-medium text-blue-600 hover:underline transition-colors">
                        {order.orderCode}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{order.customerName}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.itemsSummary}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(order.finalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.debtAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                          {formatCurrency(order.debtAmount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* ── Order detail dialog ── */}
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orderId={selectedId}
        showToast={showToast}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}
