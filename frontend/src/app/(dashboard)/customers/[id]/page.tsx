"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  CreditCard,
  StickyNote,
  Loader2,
  Package,
  Clock,
  UserCheck,
  CircleDot,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCustomerDetail,
  useCustomerPurchaseHistory,
  useCustomerDebtHistory,
  useRecordDebtPayment,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { DebtPaymentDialog } from "../_components/DebtPaymentDialog";
import OrderDetailDialog from "../../orders/_components/OrderDetailDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

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

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

// ── Animation Variants ────────────────────────────────────────────────────────

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
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <motion.p
                className="mt-1 text-2xl font-bold tracking-tight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {value}
              </motion.p>
            </div>
            <div
              className={`rounded-xl p-2.5 ${color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
        {/* Decorative gradient */}
        <div
          className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${color.includes("blue") ? "from-blue-500 to-cyan-500" : color.includes("emerald") ? "from-emerald-500 to-green-400" : color.includes("red") ? "from-red-500 to-orange-400" : "from-violet-500 to-purple-400"}`}
        />
      </Card>
    </motion.div>
  );
}

// ── Order Status Badge ────────────────────────────────────────────────────────

function OrderStatusBadge({
  status,
}: {
  status: "confirmed" | "draft" | "cancelled";
}) {
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
    <Badge
      variant="secondary"
      className={`${config.className} hover:${config.className}`}
    >
      {config.label}
    </Badge>
  );
}

// ── Debt Transaction Type Badge ───────────────────────────────────────────────

function DebtTypeBadge({
  type,
}: {
  type: "debt_created" | "payment" | "adjustment";
}) {
  const config = {
    debt_created: {
      label: "Phát sinh nợ",
      icon: TrendingUp,
      className:
        "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    },
    payment: {
      label: "Thanh toán",
      icon: CheckCircle2,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
    },
    adjustment: {
      label: "Điều chỉnh",
      icon: CircleDot,
      className:
        "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    },
  }[type];

  const IconComp = config.icon;

  return (
    <Badge
      variant="secondary"
      className={`${config.className} hover:${config.className} gap-1`}
    >
      <IconComp className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: customer, isLoading } = useCustomerDetail(id);
  const { data: purchases, isLoading: purchasesLoading } =
    useCustomerPurchaseHistory(id);
  const { data: debtHistory, isLoading: debtsLoading } =
    useCustomerDebtHistory(id);
  const deleteMutation = useDeleteCustomer();
  const { toasts, showToast, dismiss } = useToast();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Payment tab inline state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const paymentMutation = useRecordDebtPayment();

  const handleInlinePayment = async () => {
    if (!customer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await paymentMutation.mutateAsync({
        customerId: id,
        data: { amount, paymentMethod: payMethod, note: payNote || undefined },
      });
      setPaySuccess(true);
      setPayAmount("");
      setPayNote("");
      setTimeout(() => setPaySuccess(false), 3000);
    } catch {
      // handled
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteDialogOpen(false);
      router.push("/customers");
    } catch {
      // handled by mutation
    }
  };

  // ── Loading State ──
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-semibold">Không tìm thấy khách hàng</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </Button>
      </div>
    );
  }

  const hasDebt = customer.debtBalance > 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants}>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Customer Info */}
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border-2 border-border">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {customer.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    <a
                      href={`tel:${customer.phone}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {customer.phone}
                    </a>
                  </span>
                )}
                {customer.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Debt Badge & Actions */}
          <div className="flex items-center gap-3">
            {hasDebt ? (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-900 dark:bg-red-950/30"
              >
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    Còn nợ
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(customer.debtBalance)}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 dark:border-emerald-900 dark:bg-emerald-950/30"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Đã thanh toán hết
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(0)}
                  </p>
                </div>
              </motion.div>
            )}

            {hasDebt && (
              <Button
                onClick={() => setPaymentDialogOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              >
                <Banknote className="h-4 w-4" />
                Thanh toán
              </Button>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={ShoppingCart}
          label="Tổng đơn hàng"
          value={String(customer.totalOrders)}
          color="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />
        <StatCard
          icon={DollarSign}
          label="Tổng doanh thu"
          value={formatCurrency(customer.totalRevenue)}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Nợ hiện tại"
          value={formatCurrency(customer.debtBalance)}
          color={
            hasDebt
              ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          }
        />
        <StatCard
          icon={Calendar}
          label="Mua hàng gần nhất"
          value={formatDate(customer.lastPurchaseDate)}
          color="bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
        />
      </div>

      {/* ── Tabs ── */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="purchases" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger
              value="purchases"
              className="gap-1.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-300"
            >
              <Package className="h-4 w-4" />
              Lịch sử mua hàng
            </TabsTrigger>
            <TabsTrigger
              value="debts"
              className="gap-1.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-300"
            >
              <Clock className="h-4 w-4" />
              Lịch sử công nợ
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="gap-1.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-950/30 dark:data-[state=active]:text-blue-300"
            >
              <Banknote className="h-4 w-4" />
              Thanh toán
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Purchase History ── */}
          <TabsContent value="purchases">
            <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {purchasesLoading ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-6 w-[80px]" />
                      </div>
                    ))}
                  </div>
                ) : !purchases || purchases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Package className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="font-medium">Chưa có đơn hàng</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Khách hàng chưa có lịch sử mua hàng.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead>Mã đơn</TableHead>
                          <TableHead>Ngày mua</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead className="text-right">
                            Tổng tiền
                          </TableHead>
                          <TableHead>Thanh toán</TableHead>
                          <TableHead className="text-center">
                            Trạng thái
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchases.map((order) => (
                          <TableRow
                            key={order.id}
                            className="group cursor-pointer transition-colors hover:bg-muted/40"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setDetailOpen(true);
                            }}
                          >
                            <TableCell className="font-medium font-mono text-sm">
                              {order.orderCode}
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(order.createdAt)}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[250px] truncate text-sm">
                              {order.products}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                {order.paymentMethod === "cash" ? (
                                  <>
                                    <Banknote className="h-3.5 w-3.5" />
                                    Tiền mặt
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Chuyển khoản
                                  </>
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Debt History ── */}
          <TabsContent value="debts">
            <div className="space-y-4">
              {/* Current Balance Sticky Card */}
              <Card className="rounded-2xl border-border/50 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Số dư nợ hiện tại
                    </p>
                    <motion.p
                      className={`mt-1 text-3xl font-bold ${hasDebt ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {formatCurrency(customer.debtBalance)}
                    </motion.p>
                  </div>
                  {hasDebt && (
                    <Button
                      onClick={() => setPaymentDialogOpen(true)}
                      size="sm"
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white"
                    >
                      <Banknote className="h-4 w-4" />
                      Thanh toán ngay
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Debt History Table */}
              <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-0">
                  {debtsLoading ? (
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-6 w-[100px]" />
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-4 w-[100px]" />
                          <Skeleton className="h-4 w-[80px]" />
                        </div>
                      ))}
                    </div>
                  ) : !debtHistory || debtHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="font-medium">Chưa có lịch sử công nợ</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Khách hàng chưa phát sinh công nợ.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead>Ngày</TableHead>
                            <TableHead>Loại giao dịch</TableHead>
                            <TableHead className="text-right">
                              Số tiền
                            </TableHead>
                            <TableHead className="text-right">
                              Dư nợ còn lại
                            </TableHead>
                            <TableHead>Thực hiện</TableHead>
                            <TableHead>Ghi chú</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {debtHistory.map((tx) => (
                            <TableRow
                              key={tx.id}
                              className="transition-colors hover:bg-muted/40"
                            >
                              <TableCell className="text-sm whitespace-nowrap">
                                {formatDateTime(tx.date)}
                              </TableCell>
                              <TableCell>
                                <DebtTypeBadge type={tx.type} />
                              </TableCell>
                              <TableCell
                                className={`text-right font-semibold ${
                                  tx.type === "payment"
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : tx.type === "debt_created"
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {tx.type === "payment" ? "-" : "+"}
                                {formatCurrency(Math.abs(tx.amount))}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(tx.remainingBalance)}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                                  <UserCheck className="h-3.5 w-3.5" />
                                  {tx.operator}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                                {tx.note || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Tab 3: Payment ── */}
          <TabsContent value="payment">
            {!hasDebt ? (
              <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="rounded-full bg-emerald-100 p-5 dark:bg-emerald-950/30"
                  >
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </motion.div>
                  <p className="mt-4 text-lg font-semibold">
                    Khách hàng không có nợ
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tất cả các khoản nợ đã được thanh toán.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="mx-auto max-w-lg">
                <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Current Debt Display */}
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Nợ hiện tại
                      </p>
                      <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(customer.debtBalance)}
                      </p>
                    </div>

                    {/* Payment Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="inline-pay-amount">
                        Số tiền thanh toán
                      </Label>
                      <div className="relative">
                        <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="inline-pay-amount"
                          type="number"
                          placeholder="Nhập số tiền..."
                          className="pl-9 pr-12"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          VNĐ
                        </span>
                      </div>
                      {/* Quick buttons */}
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "Toàn bộ", value: customer.debtBalance },
                          {
                            label: "50%",
                            value: Math.round(customer.debtBalance / 2),
                          },
                          { label: "1 triệu", value: 1000000 },
                        ]
                          .filter(
                            (b) => b.value > 0 && b.value <= customer.debtBalance
                          )
                          .map((b) => (
                            <button
                              key={b.label}
                              type="button"
                              className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent"
                              onClick={() => setPayAmount(String(b.value))}
                            >
                              {b.label}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label>Phương thức thanh toán</Label>
                      <Select
                        value={payMethod}
                        onValueChange={(val) =>
                          setPayMethod(val as "cash" | "transfer")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <span className="flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Tiền mặt
                            </span>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Chuyển khoản
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                      <Label htmlFor="inline-pay-note">Ghi chú</Label>
                      <div className="relative">
                        <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="inline-pay-note"
                          placeholder="Ghi chú thanh toán..."
                          className="min-h-[70px] pl-9 resize-none"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Success message */}
                    {paySuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Thanh toán thành công! Số dư nợ đã được cập nhật.
                      </motion.div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setPayAmount("");
                          setPayNote("");
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        disabled={
                          paymentMutation.isPending ||
                          !payAmount ||
                          Number(payAmount) <= 0
                        }
                        onClick={handleInlinePayment}
                      >
                        {paymentMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          "Ghi nhận thanh toán"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Payment Dialog ── */}
      <DebtPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        customer={customer}
      />

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa khách hàng"
        description={`Bạn có chắc chắn muốn xóa khách hàng "${customer.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      {/* ── Order Detail Dialog ── */}
      <OrderDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        orderId={selectedOrderId ?? ""}
        showToast={showToast}
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}
