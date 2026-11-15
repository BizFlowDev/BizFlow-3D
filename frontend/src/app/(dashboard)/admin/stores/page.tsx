"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  RefreshCcw,
  Download,
  Loader2,
  MoreHorizontal,
  Eye,
  Power,
  PowerOff,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Store as StoreIcon,
  Users,
  ShoppingCart,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  Crown,
  Zap,
  Star,
  X,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStoreList,
  useStoreDetail,
  useToggleStoreStatus,
  useSubscriptionPlans,
  fetchAllAdminStores,
} from "@/hooks/useAdmin";
import type { Store, StoreListParams, SubscriptionPlan } from "@/hooks/useAdmin";
import { SubscriptionDialog } from "./_components/SubscriptionDialog";
import { StoreFormDialog } from "./_components/StoreFormDialog";

// ── Plan helpers ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Zap,
  Star: Star as React.ComponentType<{ className?: string }>,
};

function getPlanInfo(
  plans: SubscriptionPlan[],
  slug: string
): { name: string; icon: React.ComponentType<{ className?: string }> } {
  const plan = plans.find((p) => p.slug === slug);
  return {
    name: plan?.name ?? slug,
    icon: plan?.icon ? ICON_MAP[plan.icon] ?? Zap : Zap,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEffectiveSubscriptionStatus(store: {
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
}): "active" | "expired" | "trial" {
  if (store.subscriptionStatus === "expired") return "expired";
  if (
    store.subscriptionExpiresAt &&
    new Date(store.subscriptionExpiresAt).getTime() < Date.now()
  ) {
    return "expired";
  }
  return (store.subscriptionStatus as "active" | "expired" | "trial") || "expired";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatShortCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(0)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}K`;
  }
  return amount.toString();
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

// ── Store Detail Panel ────────────────────────────────────────────────────────

function StoreDetailPanel({
  storeId,
  onClose,
  onChangePlan,
  plans,
}: {
  storeId: string;
  onClose: () => void;
  onChangePlan: (store: Store) => void;
  plans: SubscriptionPlan[];
}) {
  const { data: store, isLoading } = useStoreDetail(storeId);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 space-y-4"
      >
        <Skeleton className="h-8 w-[300px]" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </motion.div>
    );
  }

  if (!store) return null;

  const planInfo = getPlanInfo(plans, store.subscriptionPlan);
  const PlanIcon = planInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
              {getInitials(store.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-bold">{store.name}</h2>
            <p className="text-sm text-muted-foreground">
              Chủ sở hữu: {store.ownerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store.isLocked ? (
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
              Đã khóa
            </Badge>
          ) : (
            (() => {
              const effStatus = getEffectiveSubscriptionStatus(store);
              return (
                <Badge
                  className={
                    effStatus === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : effStatus === "trial"
                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }
                >
                  {effStatus === "active"
                    ? "Hoạt động"
                    : effStatus === "trial"
                    ? "Dùng thử"
                    : "Hết hạn"}
                </Badge>
              );
            })()
          )}
          <Badge
            className={
              store.subscriptionPlan === "professional"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            }
          >
            <PlanIcon className="mr-1 h-3 w-3" />
            {planInfo.name}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChangePlan(store)}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Đổi gói
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Nhân viên</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {store.employeeCount}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs font-medium">Đơn hàng</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {store.totalOrders.toLocaleString("vi-VN")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Doanh thu</span>
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {formatShortCurrency(store.totalRevenue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Hết hạn</span>
              </div>
              <p className="mt-2 text-sm font-semibold">
                {formatDate(store.subscriptionExpiresAt)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Thông tin liên hệ
            </h4>
            {store.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {store.phone}
              </div>
            )}
            {store.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {store.email}
              </div>
            )}
            {store.address && (
              <div className="flex items-center gap-2 text-sm">
                <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {store.address}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Đơn hàng gần đây
            </h4>
            {store.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {formatDate(order.createdAt)}
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(order.totalAmount)}
                </span>
                <Badge
                  variant="secondary"
                  className={
                    order.status === "confirmed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                  }
                >
                  {order.status === "confirmed" ? "Xác nhận" : "Nháp"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Revenue Mini Chart */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <h4 className="mb-3 text-sm font-semibold text-muted-foreground">
            Doanh thu theo tháng
          </h4>
          <div className="flex items-end gap-2 h-24">
            {store.monthlyRevenue.map((item) => {
              const max = Math.max(
                ...store.monthlyRevenue.map((r) => r.revenue)
              );
              const height = max > 0 ? (item.revenue / max) * 100 : 0;
              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-blue-500 to-cyan-400 transition-all hover:from-blue-400 hover:to-cyan-300"
                    style={{ height: `${height}%`, minHeight: "4px" }}
                    title={`${item.month}: ${formatCurrency(item.revenue)}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {item.month.split("-")[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function AdminStoresPage() {
  // ── State ──
  const [params, setParams] = useState<StoreListParams>({
    search: "",
    status: "all",
    plan: "all",
    page: 1,
    limit: 10,
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subDialogStore, setSubDialogStore] = useState<Store | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setParams((p) => ({ ...p, search: value, page: 1 }));
      }, 300);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // ── Queries & Mutations ──
  const { data, isLoading, refetch, isFetching } = useStoreList(params);
  const stores = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  const { mutate: toggleStatus } = useToggleStoreStatus();
  const { data: planData } = useSubscriptionPlans();
  const plans = planData ?? [];

  // ── Handlers ──
  const handleStatusFilter = (value: string) => {
    setParams((p) => ({
      ...p,
      status: value as StoreListParams["status"],
      page: 1,
    }));
  };

  const handlePlanFilter = (value: string) => {
    setParams((p) => ({
      ...p,
      plan: value as StoreListParams["plan"],
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
  };

  const handleToggleStatus = (store: Store) => {
    // Nếu đang bị khóa (isLocked === true) -> Admin bấm để Mở khóa (activate = true)
    // Nếu chưa bị khóa -> Admin bấm để Khóa tài khoản (activate = false)
    const activate = Boolean(store.isLocked);
    toggleStatus({ storeId: store.id, activate });
  };

  const handleChangePlan = (store: Store) => {
    setSubDialogStore(store);
    setSubDialogOpen(true);
  };

  const handleViewDetail = (storeId: string) => {
    setSelectedStoreId(storeId);
  };

  const handleExportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const items = await fetchAllAdminStores(params);

      const XLSX = await import("xlsx");
      const headers = [
        "Cửa hàng",
        "Chủ sở hữu",
        "Email chủ sở hữu",
        "SĐT",
        "Địa chỉ",
        "Gói dịch vụ",
        "Trạng thái",
        "Ngày đăng ký",
        "Hết hạn",
        "Nhân viên",
        "Đơn hàng",
        "Doanh thu",
      ];
      const statusLabel = (store: Store) => {
        if (store.isLocked) return "Đã khóa";
        const eff = getEffectiveSubscriptionStatus(store);
        if (eff === "expired") return "Hết hạn";
        if (eff === "trial") return "Dùng thử";
        return "Đang hoạt động";
      };
      const rows = items.map((store) => [
        store.name,
        store.ownerName,
        store.ownerEmail,
        store.phone ?? "",
        store.address ?? "",
        getPlanInfo(plans, store.subscriptionPlan).name,
        statusLabel(store),
        formatDate(store.createdAt),
        formatDate(store.subscriptionExpiresAt),
        store.employeeCount,
        store.totalOrders,
        store.totalRevenue,
      ]);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = headers.map((_, i) => ({
        wch: Math.max(
          12,
          headers[i].length + 2,
          ...rows.map((r) => String(r[i] ?? "").length + 2),
        ),
      }));
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách cửa hàng");
      XLSX.writeFile(wb, `danh-sach-cua-hang-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("[Stores] Xuất Excel thất bại:", error);
    } finally {
      setExporting(false);
    }
  };

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
            <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2">
              <StoreIcon className="h-5 w-5 text-white" />
            </div>
            Quản lý Stores
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý tất cả cửa hàng đã đăng ký trên nền tảng BizFlow 3D.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFormDialogOpen(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-purple-500 hover:shadow-violet-500/40"
            id="add-store-btn"
          >
            <Plus className="mr-1 h-4 w-4" />
            Thêm cửa hàng
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Tải lại"
            id="refresh-stores-btn"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportExcel}
            disabled={exporting}
            aria-label="Xuất danh sách Excel"
            id="export-stores-btn"
            title="Xuất danh sách cửa hàng ra Excel"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="store-search"
            placeholder="Tìm theo tên, chủ sở hữu, SĐT..."
            className="pl-9"
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Tìm kiếm store"
          />
        </div>

        {/* Status Filter */}
        <Select value={params.status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[160px]" id="store-status-filter">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="expired">Hết hạn</SelectItem>
            <SelectItem value="locked">Đã khóa</SelectItem>
            <SelectItem value="trial">Dùng thử</SelectItem>
          </SelectContent>
        </Select>

        {/* Plan Filter */}
        <Select value={params.plan} onValueChange={handlePlanFilter}>
          <SelectTrigger className="w-[160px]" id="store-plan-filter">
            <SelectValue placeholder="Gói dịch vụ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả gói</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.slug}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* ── Store Detail Panel ── */}
      <AnimatePresence>
        {selectedStoreId && (
          <StoreDetailPanel
            storeId={selectedStoreId}
            onClose={() => setSelectedStoreId(null)}
            onChangePlan={handleChangePlan}
            plans={plans}
          />
        )}
      </AnimatePresence>

      {/* ── Table Card ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-3 w-[180px]" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[100px]" />
                <Skeleton className="h-6 w-[90px]" />
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="rounded-full bg-muted p-6 mb-6"
            >
              <StoreIcon className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Chưa có cửa hàng</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Chưa có cửa hàng nào đăng ký trên nền tảng.
            </p>
            <Button
              onClick={() => setFormDialogOpen(true)}
              className="mt-4 bg-gradient-to-r from-violet-600 to-purple-600 font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-purple-500"
              id="empty-add-store-btn"
            >
              <Plus className="mr-1 h-4 w-4" />
              Thêm cửa hàng đầu tiên
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="sticky top-0 w-[280px] min-w-[220px]">
                      Cửa hàng
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[140px]">
                      Chủ sở hữu
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[120px]">
                      SĐT
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[120px]">
                      Gói dịch vụ
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[110px]">
                      Trạng thái
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[120px]">
                      Ngày đăng ký
                    </TableHead>
                    <TableHead className="sticky top-0 text-center w-[80px]">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store, index) => {
                    const planInfo = getPlanInfo(plans, store.subscriptionPlan);
                    const PlanIcon = planInfo.icon;

                    return (
                      <motion.tr
                        key={store.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="group border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted cursor-pointer"
                        onClick={() => handleViewDetail(store.id)}
                      >
                        {/* Store Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 transition-transform group-hover:scale-105">
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                                {getInitials(store.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium hover:text-blue-600 transition-colors line-clamp-1">
                                {store.name}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {store.address ?? "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Owner */}
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {store.ownerName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {store.ownerEmail}
                            </p>
                          </div>
                        </TableCell>

                        {/* Phone */}
                        <TableCell>
                          {store.phone ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {store.phone}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Plan */}
                        <TableCell className="text-center">
                          <Badge
                            className={
                              store.subscriptionPlan === "professional"
                                ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400"
                            }
                          >
                            <PlanIcon className="mr-1 h-3 w-3" />
                            {planInfo.name}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {store.isLocked ? (
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                              Đã khóa
                            </Badge>
                          ) : (
                            (() => {
                              const effStatus = getEffectiveSubscriptionStatus(store);
                              return (
                                <Badge
                                  className={
                                    effStatus === "active"
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : effStatus === "trial"
                                      ? "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400"
                                  }
                                >
                                  {effStatus === "active"
                                    ? "Hoạt động"
                                    : effStatus === "trial"
                                    ? "Dùng thử"
                                    : "Hết hạn"}
                                </Badge>
                              );
                            })()
                          )}
                        </TableCell>

                        {/* Registered Date */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(store.createdAt)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label="Thao tác"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewDetail(store.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleChangePlan(store)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Đổi gói dịch vụ
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(store)}
                                className={
                                  store.isLocked
                                    ? "text-emerald-600 focus:text-emerald-600"
                                    : "text-destructive focus:text-destructive"
                                }
                              >
                                {store.isLocked ? (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Mở khóa tài khoản
                                  </>
                                ) : (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Khóa tài khoản
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Hiển thị{" "}
                <span className="font-medium">{stores.length}</span> /{" "}
                <span className="font-medium">{total}</span> cửa hàng
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <span className="px-3 text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* ── Subscription Dialog ── */}
      <SubscriptionDialog
        open={subDialogOpen}
        onOpenChange={setSubDialogOpen}
        store={subDialogStore}
        onSuccess={() => refetch()}
      />

      {/* ── Add Store Dialog ── */}
      <StoreFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => refetch()}
      />
    </motion.div>
  );
}
