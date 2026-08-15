"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  Plus,
  RefreshCcw,
  Crown,
  Zap,
  Star,
  Users,
  TrendingUp,
  CheckCircle2,
  Pencil,
  Trash2,
  History,
  Store as StoreIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Search,
  Loader2,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useSubscriptionPlans,
  useDeleteSubscriptionPlan,
  useStoreList,
  usePlatformAnalytics,
  useSubscriptionHistory,
} from "@/hooks/useAdmin";
import type {
  SubscriptionPlan,
  StoreListParams,
  SubscriptionHistoryParams,
} from "@/hooks/useAdmin";
import { PlanEditorDialog } from "./_components/PlanEditorDialog";

// ── Icon Mapper ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Crown,
  Zap,
  Star,
};

function getPlanIcon(iconName: string | null) {
  return ICON_MAP[iconName ?? "Zap"] ?? Zap;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KPICards({
  plans,
  analytics,
  isLoading,
}: {
  plans: SubscriptionPlan[];
  analytics: { mrr: number; activeSubscriptions: number; totalStores: number } | undefined;
  isLoading: boolean;
}) {
  const totalStores = plans.reduce((sum, p) => sum + (p.storeCount ?? 0), 0);
  const activePlans = plans.filter((p) => p.isActive).length;

  const kpis = [
    {
      label: "Doanh thu định kỳ (MRR)",
      value: analytics ? formatCurrency(analytics.mrr) : "—",
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Tổng cửa hàng",
      value: totalStores.toString(),
      icon: StoreIcon,
      gradient: "from-blue-500 to-indigo-500",
      bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Đang hoạt động",
      value: analytics?.activeSubscriptions?.toString() ?? "—",
      icon: TrendingUp,
      gradient: "from-violet-500 to-purple-500",
      bgGradient: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-900/20",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Gói đăng ký",
      value: `${activePlans} active`,
      icon: CreditCard,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <motion.div key={kpi.label} variants={itemVariants}>
          <Card className={`border-0 bg-gradient-to-br ${kpi.bgGradient} shadow-sm`}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 ${kpi.iconColor}`}>
                <div className={`rounded-lg bg-gradient-to-br ${kpi.gradient} p-1.5`}>
                  <kpi.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-xs font-medium">{kpi.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="mt-2 h-8 w-[100px]" />
              ) : (
                <p className="mt-2 text-2xl font-bold tabular-nums">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ── Plan Cards Section ────────────────────────────────────────────────────────

function PlanCardsSection({
  plans,
  isLoading,
  onEdit,
  onDelete,
}: {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  onEdit: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[360px] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan, index) => {
        const PlanIcon = getPlanIcon(plan.icon);
        const totalStores = plan.storeCount ?? 0;

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group relative overflow-hidden border-0 bg-card/50 backdrop-blur-sm shadow-sm transition-all hover:shadow-md">
              {/* Gradient Top Bar */}
              <div
                className={`h-1.5 bg-gradient-to-r ${plan.colorFrom ?? "from-blue-500"} ${plan.colorTo ?? "to-cyan-500"}`}
              />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl bg-gradient-to-br ${plan.colorFrom ?? "from-blue-500"} ${plan.colorTo ?? "to-cyan-500"} p-2.5 shadow-lg`}
                    >
                      <PlanIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {plan.slug} • {plan.isActive ? "Đang hoạt động" : "Tạm dừng"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(plan)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(plan)}
                      disabled={totalStores > 0}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div>
                  <p className="text-3xl font-bold tabular-nums bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {formatCurrency(plan.price)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /tháng
                    </span>
                  </p>
                  {plan.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/20 p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{totalStores}</p>
                    <p className="text-[11px] text-muted-foreground">Cửa hàng</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-center">
                    <p className="text-2xl font-bold tabular-nums">{plan.maxEmployees}</p>
                    <p className="text-[11px] text-muted-foreground">NV tối đa</p>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Status Badge */}
                <div className="flex items-center justify-between pt-2">
                  <Badge
                    className={
                      plan.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    }
                  >
                    {plan.isActive ? "Đang hoạt động" : "Tạm dừng"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Tạo: {formatDate(plan.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Stores Table ──────────────────────────────────────────────────────────────

function StoresByPlanTable({
  plans,
}: {
  plans: SubscriptionPlan[];
}) {
  const [params, setParams] = useState<StoreListParams>({
    page: 1,
    limit: 10,
    plan: "all",
    status: "all",
  });
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useStoreList(params);
  const stores = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    // Simple debounce
    const val = e.target.value;
    setTimeout(() => {
      setParams((p) => ({ ...p, search: val, page: 1 }));
    }, 300);
  };

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <StoreIcon className="h-4 w-4 text-muted-foreground" />
            Cửa hàng theo gói
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                className="h-8 w-[180px] pl-8 text-sm"
                value={searchInput}
                onChange={handleSearch}
              />
            </div>
            <Select
              value={params.plan}
              onValueChange={(v) => setParams((p) => ({ ...p, plan: v as StoreListParams["plan"], page: 1 }))}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Gói" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả gói</SelectItem>
                {plans.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={params.status}
              onValueChange={(v) => setParams((p) => ({ ...p, status: v as StoreListParams["status"], page: 1 }))}
            >
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
                <SelectItem value="trial">Dùng thử</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="min-w-[200px]">Cửa hàng</TableHead>
              <TableHead className="min-w-[140px]">Chủ sở hữu</TableHead>
              <TableHead className="text-center min-w-[100px]">Gói</TableHead>
              <TableHead className="text-center min-w-[100px]">Trạng thái</TableHead>
              <TableHead className="min-w-[110px]">Hết hạn</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="mx-auto h-5 w-[70px]" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="mx-auto h-5 w-[70px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                </TableRow>
              ))
            ) : stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Không tìm thấy cửa hàng nào
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => {
                const planObj = plans.find((p) => p.slug === store.subscriptionPlan);
                const PIcon = getPlanIcon(planObj?.icon ?? null);
                return (
                  <TableRow key={store.id} className="transition-colors hover:bg-muted/30">
                    <TableCell>
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-xs text-muted-foreground">{store.address ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{store.ownerName}</p>
                        <p className="text-xs text-muted-foreground">{store.ownerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          store.subscriptionPlan === "professional"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400"
                        }
                      >
                        <PIcon className="mr-1 h-3 w-3" />
                        {planObj?.name ?? store.subscriptionPlan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={
                          store.subscriptionStatus === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : store.subscriptionStatus === "trial"
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"
                            : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        }
                      >
                        {store.subscriptionStatus === "active"
                          ? "Hoạt động"
                          : store.subscriptionStatus === "trial"
                          ? "Dùng thử"
                          : "Hết hạn"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(store.subscriptionExpiresAt)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{stores.length}</span> / <span className="font-medium">{total}</span> cửa hàng
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setParams((p) => ({ ...p, page: currentPage - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: currentPage + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── History Table ─────────────────────────────────────────────────────────────

function HistorySection() {
  const [params, setParams] = useState<SubscriptionHistoryParams>({
    page: 1,
    limit: 15,
  });

  const { data, isLoading } = useSubscriptionHistory(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  return (
    <Card className="border-0 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-muted-foreground" />
          Lịch sử thay đổi gói
        </CardTitle>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="min-w-[160px]">Thời gian</TableHead>
              <TableHead className="min-w-[160px]">Cửa hàng</TableHead>
              <TableHead className="text-center min-w-[120px]">Gói cũ</TableHead>
              <TableHead className="text-center w-[40px]" />
              <TableHead className="text-center min-w-[120px]">Gói mới</TableHead>
              <TableHead className="min-w-[120px]">Người thay đổi</TableHead>
              <TableHead className="min-w-[140px]">Ghi chú</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-[80px]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  Chưa có lịch sử thay đổi gói đăng ký
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                  <TableCell>
                    <span className="text-sm">{formatDateTime(item.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{item.storeName ?? item.storeId.slice(0, 8)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.oldPlan ? (
                      <Badge variant="outline" className="text-xs">
                        {item.oldPlan}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-xs">
                      {item.newPlan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {item.changedByName ?? "Hệ thống"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-1">
                      {item.note ?? "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{items.length}</span> / <span className="font-medium">{total}</span> bản ghi
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setParams((p) => ({ ...p, page: currentPage - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: currentPage + 1 }))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans, isLoading: plansLoading, refetch, isFetching } = useSubscriptionPlans();
  const { data: analytics, isLoading: analyticsLoading } = usePlatformAnalytics();
  const { mutate: deletePlan, isPending: isDeleting } = useDeleteSubscriptionPlan();

  const allPlans = plans ?? [];

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setEditorOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditorOpen(true);
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    if (confirm(`Bạn có chắc muốn xoá gói "${plan.name}"?`)) {
      deletePlan(plan.id);
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
            <div className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            Quản lý Gói Đăng ký
          </h1>
          <p className="mt-1 text-muted-foreground">
            Quản lý các gói subscription và theo dõi lịch sử thay đổi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Tải lại"
          >
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button
            onClick={handleCreatePlan}
            className="bg-gradient-to-r from-blue-600 to-indigo-500 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-500 hover:to-indigo-400 hover:shadow-blue-500/40"
          >
            <Plus className="h-4 w-4" />
            Tạo gói mới
          </Button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <KPICards
        plans={allPlans}
        analytics={analytics}
        isLoading={plansLoading || analyticsLoading}
      />

      {/* ── Tabs: Plans / Stores / History ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="plans" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Gói đăng ký
            </TabsTrigger>
            <TabsTrigger value="stores" className="gap-1.5">
              <StoreIcon className="h-3.5 w-3.5" />
              Cửa hàng
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Lịch sử
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <PlanCardsSection
              plans={allPlans}
              isLoading={plansLoading}
              onEdit={handleEditPlan}
              onDelete={handleDeletePlan}
            />
          </TabsContent>

          <TabsContent value="stores">
            <StoresByPlanTable plans={allPlans} />
          </TabsContent>

          <TabsContent value="history">
            <HistorySection />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Plan Editor Dialog ── */}
      <PlanEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        plan={editingPlan}
      />
    </motion.div>
  );
}
