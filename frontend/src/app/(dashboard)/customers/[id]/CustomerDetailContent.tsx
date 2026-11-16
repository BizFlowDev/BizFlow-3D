"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  Printer,
  Receipt,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useCurrentStore } from "@/hooks/useStore";
import {
  useCreateOrderStripeSession,
  useOrderStripeSessionStatus,
  useCancelOrderStripeSession,
  type OrderStripeSessionData,
} from "@/hooks/useOrders";
import {
  StripeCountdownTimer,
  StripeExpiredOverlay,
} from "@/components/shared/StripeCountdownTimer";
import {
  printDebtReceiptPDF,
  printDebtReceiptThermal,
  type DebtReceiptData,
} from "@/lib/debtReceipt";
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

export default function CustomerDetailContent({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: customer, isLoading } = useCustomerDetail(id);
  const { data: purchases, isLoading: purchasesLoading } =
    useCustomerPurchaseHistory(id);
  const { data: debtHistory, isLoading: debtsLoading } =
    useCustomerDebtHistory(id);
  const deleteMutation = useDeleteCustomer();
  const { toasts, showToast, dismiss } = useToast();
  const { data: store } = useCurrentStore();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Payment tab inline state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "stripe">("cash");
  const [payNote, setPayNote] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    previousDebt: number;
    paidAmount: number;
    remainingDebt: number;
    paymentMethod: "cash" | "stripe" | "transfer";
    note?: string;
  } | null>(null);

  // Stripe state
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSession, setStripeSession] = useState<OrderStripeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [isStripeExpired, setIsStripeExpired] = useState(false);

  const paymentMutation = useRecordDebtPayment();
  const createStripeSessionMutation = useCreateOrderStripeSession();
  const cancelStripeSessionMutation = useCancelOrderStripeSession();
  const {
    data: stripeStatus,
    refetch: refetchStripeStatus,
    isFetching: isCheckingStripe,
  } = useOrderStripeSessionStatus(stripeSession?.sessionId, stripeModalOpen && !isStripeExpired);

  const autoSubmittedRef = useRef(false);

  // Handle open Stripe checkout modal & generate QR session
  const handleOpenStripeModal = useCallback(async () => {
    if (!customer) return;
    const amount = Number(payAmount);
    if (!amount || amount < 1000) {
      showToast("info", "Vui lòng nhập số tiền hợp lệ", "Số tiền tối thiểu 1,000₫");
      return;
    }
    if (amount > customer.debtBalance) {
      showToast("error", "Số tiền không hợp lệ", `Vượt quá dư nợ (${formatCurrency(customer.debtBalance)})`);
      return;
    }
    setStripeError(null);
    setIsStripeExpired(false);
    setStripeModalOpen(true);

    try {
      const session = await createStripeSessionMutation.mutateAsync({
        amount,
        orderCode: `TTNO-${customer.code || customer.id.slice(0, 8)}`,
        customerName: customer.name,
        items: [
          {
            name: `Thu nợ khách hàng: ${customer.name}`,
            quantity: 1,
            unitPrice: amount,
          },
        ],
      });
      setStripeSession(session);
      setIsStripeExpired(false);
    } catch (err: any) {
      setStripeError(err?.message || "Không thể khởi tạo phiên thanh toán Stripe");
    }
  }, [customer, payAmount, createStripeSessionMutation, showToast]);

  // Hủy phiên Stripe sau 15 phút
  const handleStripeExpire = useCallback(() => {
    setIsStripeExpired(true);
    if (stripeSession?.sessionId) {
      cancelStripeSessionMutation.mutate(stripeSession.sessionId);
    }
  }, [stripeSession?.sessionId, cancelStripeSessionMutation]);

  // Lắng nghe trạng thái hết hạn từ server
  useEffect(() => {
    if (stripeStatus?.isExpired || stripeStatus?.status === "expired") {
      setIsStripeExpired(true);
    }
  }, [stripeStatus?.isExpired, stripeStatus?.status]);

  const handleInlinePayment = async () => {
    if (!customer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Double Guard: Chặn hoàn tất nợ nếu chọn Stripe mà chưa nhận được tiền
    if (payMethod === "stripe" && !stripeStatus?.isPaid) {
      handleOpenStripeModal();
      return;
    }

    const previousDebt = customer.debtBalance;
    const remainingDebt = Math.max(0, previousDebt - amount);

    try {
      await paymentMutation.mutateAsync({
        customerId: id,
        data: { amount, paymentMethod: payMethod, note: payNote || undefined },
      });
      setLastPaymentInfo({
        previousDebt,
        paidAmount: amount,
        remainingDebt,
        paymentMethod: payMethod,
        note: payNote,
      });
      setStripeModalOpen(false);
      setPaySuccess(true);
      setPayAmount("");
      setPayNote("");
      showToast("success", "Ghi nhận thu nợ thành công!");
    } catch (err: any) {
      showToast("error", "Lỗi khi ghi nhận thu nợ", err?.message);
    }
  };

  // Reset auto submit lock when modal closes
  useEffect(() => {
    if (!stripeModalOpen || !stripeSession) {
      autoSubmittedRef.current = false;
    }
  }, [stripeModalOpen, stripeSession]);

  // Auto-complete payment when Stripe is paid
  useEffect(() => {
    if (
      stripeStatus?.isPaid &&
      payMethod === "stripe" &&
      stripeModalOpen &&
      !isStripeExpired &&
      !autoSubmittedRef.current &&
      !paymentMutation.isPending
    ) {
      autoSubmittedRef.current = true;
      handleInlinePayment();
    }
  }, [stripeStatus?.isPaid, payMethod, stripeModalOpen]);

  const handlePrintPDF = (dataToPrint?: typeof lastPaymentInfo) => {
    const info = dataToPrint || lastPaymentInfo;
    if (!customer || !info) return;
    const receiptData: DebtReceiptData = {
      storeName: store?.name || "BizFlow 3D",
      storeAddress: store?.address || undefined,
      storePhone: store?.phone || undefined,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      previousDebt: info.previousDebt,
      paidAmount: info.paidAmount,
      remainingDebt: info.remainingDebt,
      paymentMethod: info.paymentMethod,
      note: info.note || undefined,
    };
    printDebtReceiptPDF(receiptData);
  };

  const handlePrintThermal = (dataToPrint?: typeof lastPaymentInfo) => {
    const info = dataToPrint || lastPaymentInfo;
    if (!customer || !info) return;
    const receiptData: DebtReceiptData = {
      storeName: store?.name || "BizFlow 3D",
      storeAddress: store?.address || undefined,
      storePhone: store?.phone || undefined,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      previousDebt: info.previousDebt,
      paidAmount: info.paidAmount,
      remainingDebt: info.remainingDebt,
      paymentMethod: info.paymentMethod,
      note: info.note || undefined,
    };
    printDebtReceiptThermal(receiptData);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteDialogOpen(false);
      onBack();
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
        <Button onClick={onBack} className="mt-4" variant="outline">
          <ArrowLeft className="h-4 w-4" />
          Quay lại
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
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
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
                className={`flex items-center gap-2 rounded-2xl border px-5 py-3 ${
                  customer.isOverdue
                    ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    customer.isOverdue ? "text-red-500 animate-pulse" : "text-amber-500"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs font-semibold ${
                        customer.isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {customer.isOverdue ? "Nợ quá hạn" : "Còn nợ"}
                    </p>
                    {customer.isOverdue && (
                      <span className="rounded bg-red-200/80 px-1.5 py-0.2 text-[10px] font-bold text-red-700 dark:bg-red-900 dark:text-red-200">
                        {customer.overdueDays} ngày
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      customer.isOverdue
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {formatCurrency(customer.debtBalance)}
                  </p>
                  {customer.creditLimit > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Hạn mức: {formatCurrency(customer.creditLimit)}
                      {customer.debtBalance > customer.creditLimit && (
                        <span className="text-red-500 font-bold ml-1">(Vượt HM)</span>
                      )}
                    </p>
                  )}
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
                  {customer.creditLimit > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      Hạn mức: {formatCurrency(customer.creditLimit)}
                    </p>
                  )}
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
                            <TableHead className="text-center">Biên lai</TableHead>
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
                              <TableCell className="max-w-[220px] truncate text-sm">
                                {tx.orderId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrderId(tx.orderId!);
                                      setDetailOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                    title="Bấm để xem chi tiết đơn hàng"
                                  >
                                    <Receipt className="h-3.5 w-3.5 shrink-0" />
                                    <span>{tx.note}</span>
                                  </button>
                                ) : (
                                  <span className="text-muted-foreground">{tx.note || "—"}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {tx.type === "payment" ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                                      title="In phiếu thu PDF (A5/A4)"
                                      onClick={() => {
                                        handlePrintPDF({
                                          previousDebt: tx.remainingBalance + Math.abs(tx.amount),
                                          paidAmount: Math.abs(tx.amount),
                                          remainingDebt: tx.remainingBalance,
                                          paymentMethod: "cash",
                                          note: tx.note || undefined,
                                        });
                                      }}
                                    >
                                      <Receipt className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                                      title="In nhiệt K80"
                                      onClick={() => {
                                        handlePrintThermal({
                                          previousDebt: tx.remainingBalance + Math.abs(tx.amount),
                                          paidAmount: Math.abs(tx.amount),
                                          remainingDebt: tx.remainingBalance,
                                          paymentMethod: "cash",
                                          note: tx.note || undefined,
                                        });
                                      }}
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : tx.orderId ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                                    onClick={() => {
                                      setSelectedOrderId(tx.orderId!);
                                      setDetailOpen(true);
                                    }}
                                    title="Xem chi tiết đơn hàng"
                                  >
                                    Xem đơn
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
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
            {!hasDebt && !paySuccess ? (
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
                    Tất cả các khoản nợ đã được thanh toán đầy đủ.
                  </p>
                </CardContent>
              </Card>
            ) : paySuccess && lastPaymentInfo ? (
              <div className="mx-auto max-w-lg">
                <Card className="rounded-2xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6 text-center space-y-5">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="h-10 w-10" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">Thanh toán thành công!</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Số dư công nợ của khách hàng đã được cập nhật chính xác.
                      </p>
                    </div>

                    <div className="w-full rounded-xl border bg-muted/40 p-4 text-left space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Khách hàng:</span>
                        <span className="font-semibold">{customer.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Số tiền đã thu:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(lastPaymentInfo.paidAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hình thức:</span>
                        <span className="font-medium">
                          {lastPaymentInfo.paymentMethod === "transfer"
                            ? "Chuyển khoản (VietQR)"
                            : "Tiền mặt"}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Công nợ còn lại:</span>
                        <span className="font-bold text-red-500">
                          {formatCurrency(lastPaymentInfo.remainingDebt)}
                        </span>
                      </div>
                    </div>

                    <div className="w-full pt-2 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 gap-2 font-medium"
                          onClick={() => handlePrintThermal()}
                        >
                          <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                          In nhiệt (K80)
                        </Button>
                        <Button
                          type="button"
                          className="h-11 gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
                          onClick={() => handlePrintPDF()}
                        >
                          <Printer className="h-4 w-4" />
                          In phiếu thu (PDF)
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setPaySuccess(false);
                          setLastPaymentInfo(null);
                        }}
                      >
                        Tiếp tục thu nợ
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                          className="pl-9 pr-12 font-semibold"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          VNĐ
                        </span>
                      </div>
                      {/* Quick buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { label: "Toàn bộ", value: customer.debtBalance },
                          {
                            label: "50%",
                            value: Math.round(customer.debtBalance / 2),
                          },
                          { label: "2 triệu", value: 2000000 },
                          { label: "1 triệu", value: 1000000 },
                          { label: "500K", value: 500000 },
                        ]
                          .filter(
                            (b) => b.value > 0 && b.value <= customer.debtBalance
                          )
                          .map((b) => (
                            <button
                              key={b.label}
                              type="button"
                              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
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
                          setPayMethod(val as "cash" | "stripe")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <span className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-emerald-500" />
                              Tiền mặt
                            </span>
                          </SelectItem>
                          <SelectItem value="stripe">
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-indigo-500" />
                              Cổng Stripe (Thẻ quốc tế & QR Code)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stripe Dynamic Section */}
                    {payMethod === "stripe" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              Cổng thanh toán Stripe PCI-DSS
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Visa / Master / Apple Pay
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-background/80 rounded-lg p-3 border border-indigo-100 dark:border-indigo-900/40">
                            <div className="space-y-1 text-xs">
                              <p className="font-medium text-foreground">
                                Số tiền thu:{" "}
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {formatCurrency(Number(payAmount) || 0)}
                                </span>
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-muted-foreground">Trạng thái:</span>
                                {isStripeExpired ? (
                                  <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Mã QR đã hết hạn (15 phút)
                                  </span>
                                ) : stripeStatus?.isPaid ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Đã nhận thanh toán
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                    <Clock className="h-3.5 w-3.5 animate-spin" /> Chờ khách quét mã / thanh toán
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              onClick={handleOpenStripeModal}
                              disabled={createStripeSessionMutation.isPending || !payAmount || Number(payAmount) < 1000}
                              className={`shrink-0 gap-1.5 font-medium shadow-sm ${
                                isStripeExpired
                                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              }`}
                            >
                              {createStripeSessionMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <QrCode className="h-4 w-4" />
                              )}
                              {isStripeExpired
                                ? "Tạo lại mã QR mới"
                                : stripeSession
                                ? "Xem mã QR Stripe"
                                : "Mở mã QR Stripe"}
                            </Button>
                          </div>

                          <p className="text-[11px] text-muted-foreground italic text-center">
                            Hệ thống tự động tra soát giao dịch real-time chu kỳ 2s và khóa nút xác nhận cho đến khi khách thanh toán xong.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Remaining balance preview */}
                    {Number(payAmount) > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"
                      >
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            Nợ còn lại sau thanh toán:
                          </span>
                          <span className="font-bold text-amber-800 dark:text-amber-200">
                            {formatCurrency(Math.max(0, customer.debtBalance - Number(payAmount)))}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Note */}
                    <div className="space-y-2">
                      <Label htmlFor="inline-pay-note">Ghi chú</Label>
                      <div className="relative">
                        <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="inline-pay-note"
                          placeholder="Ghi chú thanh toán..."
                          className="min-h-[70px] pl-9 resize-none text-sm"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                        />
                      </div>
                    </div>

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

                      {payMethod === "stripe" && !stripeStatus?.isPaid ? (
                        <Button
                          type="button"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 font-semibold"
                          disabled={!payAmount || Number(payAmount) < 1000 || createStripeSessionMutation.isPending}
                          onClick={handleOpenStripeModal}
                        >
                          {createStripeSessionMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              Đang tạo mã QR...
                            </>
                          ) : (
                            <>
                              <QrCode className="h-4 w-4 mr-1.5" />
                              Mở mã QR Stripe ({formatCurrency(Number(payAmount) || 0)})
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/25 font-semibold"
                          disabled={
                            paymentMutation.isPending ||
                            !payAmount ||
                            Number(payAmount) <= 0
                          }
                          onClick={handleInlinePayment}
                        >
                          {paymentMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                              Đang xử lý...
                            </>
                          ) : payMethod === "stripe" && stripeStatus?.isPaid ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                              Đã nhận Stripe · Ghi nhận ngay
                            </>
                          ) : (
                            "Ghi nhận thanh toán"
                          )}
                        </Button>
                      )}
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

      {/* ── Modal Thanh Toán Stripe QR ── */}
      <Dialog open={stripeModalOpen} onOpenChange={setStripeModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl p-6 border-indigo-200 dark:border-indigo-900 bg-background/95 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-500" />
              Thanh Toán Công Nợ Qua Stripe
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quét mã QR bằng ứng dụng ngân hàng hoặc mở cổng Stripe để thanh toán bằng thẻ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-4 py-2">
            {/* Amount Banner */}
            <div className="w-full text-center bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 py-2.5 px-4 rounded-xl">
              <span className="text-xs text-muted-foreground block">Số tiền cần thu</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(Number(payAmount) || 0)}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Khách hàng: <strong>{customer.name}</strong>
              </span>
            </div>

            {/* Countdown Timer */}
            {stripeSession && !stripeError && !stripeStatus?.isPaid && (
              <StripeCountdownTimer
                initialSeconds={900}
                onExpire={handleStripeExpire}
                isPaused={!!stripeStatus?.isPaid}
              />
            )}

            {/* QR Code Container */}
            <div className="relative p-3.5 bg-white rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 shadow-md">
              <StripeExpiredOverlay
                isExpired={isStripeExpired}
                onRegenerate={handleOpenStripeModal}
              >
                {createStripeSessionMutation.isPending ? (
                  <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-indigo-600">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-xs font-medium">Đang khởi tạo phiên Stripe...</span>
                  </div>
                ) : stripeError ? (
                  <div className="h-56 w-56 flex flex-col items-center justify-center gap-2 text-red-500 text-center p-3">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <span className="text-xs font-semibold">{stripeError}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenStripeModal}
                      className="mt-2 text-xs"
                    >
                      Thử lại
                    </Button>
                  </div>
                ) : stripeSession ? (
                  <div className="relative group">
                    {stripeSession.qrCodeUrl ? (
                      <img
                        src={stripeSession.qrCodeUrl}
                        alt="Stripe Checkout QR"
                        className="h-56 w-56 object-contain rounded-lg"
                      />
                    ) : (
                      <QRCodeSVG
                        value={stripeSession.checkoutUrl}
                        size={224}
                        level="H"
                        className="rounded-lg"
                      />
                    )}
                    {stripeStatus?.isPaid && (
                      <div className="absolute inset-0 bg-emerald-500/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center text-white gap-2">
                        <CheckCircle2 className="h-12 w-12" />
                        <span className="font-bold text-sm">Đã Nhận Thanh Toán!</span>
                        <span className="text-[11px] text-emerald-100">Đang lưu phiếu thu...</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </StripeExpiredOverlay>
            </div>

            {/* Status & Actions */}
            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        stripeStatus?.isPaid
                          ? "bg-emerald-400"
                          : isStripeExpired
                          ? "bg-red-400"
                          : "bg-amber-400"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        stripeStatus?.isPaid
                          ? "bg-emerald-500"
                          : isStripeExpired
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                    />
                  </span>
                  Trạng thái đối soát:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-bold ${
                      stripeStatus?.isPaid
                        ? "text-emerald-600 dark:text-emerald-400"
                        : isStripeExpired
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {stripeStatus?.isPaid
                      ? "Thành công (Paid)"
                      : isStripeExpired
                      ? "Đã hủy do hết hạn (15 phút)"
                      : "Chờ thanh toán..."}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => refetchStripeStatus()}
                    disabled={isCheckingStripe || isStripeExpired}
                    title="Kiểm tra trạng thái ngay"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isCheckingStripe ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>

              {stripeSession?.checkoutUrl && !isStripeExpired && (
                <a
                  href={stripeSession.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:underline dark:text-indigo-400 py-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Mở trang thanh toán Stripe trên trình duyệt
                </a>
              )}

              {/* Regenerate Button if Expired */}
              {isStripeExpired && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/40"
                  onClick={handleOpenStripeModal}
                  disabled={createStripeSessionMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Tạo lại mã QR Stripe (15 phút mới)
                </Button>
              )}

              {/* Locked Confirmation Button until Paid */}
              <Button
                type="button"
                className={`w-full font-semibold transition-all shadow-md ${
                  stripeStatus?.isPaid
                    ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/25"
                    : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                }`}
                disabled={!stripeStatus?.isPaid || isStripeExpired || paymentMutation.isPending}
                onClick={handleInlinePayment}
              >
                {paymentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Đang lưu phiếu thu...
                  </>
                ) : stripeStatus?.isPaid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Đã nhận thanh toán · Hoàn tất thu nợ ngay
                  </>
                ) : isStripeExpired ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-1.5 text-red-500" />
                    Mã QR đã hết hạn (Cần tạo mã mới)
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1.5 animate-spin" />
                    Chưa thanh toán (Không thể xác nhận)
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => setStripeModalOpen(false)}
              >
                Đóng cửa sổ mã QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}
