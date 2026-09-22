"use client";

import { use, useState, useMemo } from "react";
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
  Printer,
  Receipt,
  QrCode,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
} from "lucide-react";
import { VietQRModal } from "@/components/shared/VietQRModal";
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
import { generateVietQRUrl, getBankByCode, formatPaymentMemo } from "@/lib/vietqr";
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
  const { data: store } = useCurrentStore();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Payment tab inline state
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [payNote, setPayNote] = useState("");
  const [paySuccess, setPaySuccess] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{
    previousDebt: number;
    paidAmount: number;
    remainingDebt: number;
    paymentMethod: "cash" | "transfer";
    note?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrZoomOpen, setQrZoomOpen] = useState(false);

  const paymentMutation = useRecordDebtPayment();

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const vietQrInfo = useMemo(() => {
    if (!store?.bankCode || !store?.bankAccountNumber || !customer) return null;
    const bank = getBankByCode(store.bankCode);
    const memo = formatPaymentMemo(customer.code || customer.name, "TT NO");
    const amount = Number(payAmount) > 0 ? Number(payAmount) : 0;
    const qrUrl = generateVietQRUrl({
      bankCode: store.bankCode,
      accountNumber: store.bankAccountNumber,
      accountName: store.bankAccountHolder || "",
      amount,
      memo,
      template: "compact2",
    });
    return {
      bank,
      memo,
      amount,
      qrUrl,
      accountNumber: store.bankAccountNumber,
      accountHolder: store.bankAccountHolder,
    };
  }, [store, customer, payAmount]);

  const handleInlinePayment = async () => {
    if (!customer || !payAmount) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return;

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
      setQrZoomOpen(false);
      setPaySuccess(true);
      setPayAmount("");
      setPayNote("");
    } catch {
      // handled
    }
  };

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
                          setPayMethod(val as "cash" | "transfer")
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
                          <SelectItem value="transfer">
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-blue-500" />
                              Chuyển khoản (VietQR Napas247)
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* VietQR Dynamic Section */}
                    {payMethod === "transfer" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/60 dark:bg-blue-950/20"
                      >
                        {vietQrInfo ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                <QrCode className="h-4 w-4" />
                                Quét mã VietQR chuyển khoản
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {vietQrInfo.bank?.shortName || "Napas247"}
                              </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 rounded-lg p-3 border border-blue-100 dark:border-blue-900/40">
                              {/* QR Code Image with Zoom Preview */}
                              <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <div
                                  className="relative group cursor-pointer overflow-hidden rounded-lg border bg-white p-1 shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-blue-500/50"
                                  onClick={() => setQrZoomOpen(true)}
                                  title="Nhấp để phóng to mã QR"
                                >
                                  <img
                                    src={vietQrInfo.qrUrl}
                                    alt="VietQR Code"
                                    className="h-32 w-32 rounded object-contain transition-transform group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                    <span className="flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow">
                                      <Maximize2 className="h-3 w-3" /> Phóng to
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setQrZoomOpen(true)}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  <Maximize2 className="h-3 w-3" /> Phóng to mã QR
                                </button>
                              </div>

                              <div className="flex-1 space-y-2 text-xs w-full">
                                <div>
                                  <p className="text-muted-foreground text-[11px]">Ngân hàng:</p>
                                  <p className="font-semibold text-foreground">
                                    {vietQrInfo.bank?.name} ({vietQrInfo.bank?.shortName})
                                  </p>
                                </div>

                                <div>
                                  <p className="text-muted-foreground text-[11px]">Số tài khoản:</p>
                                  <div className="flex items-center justify-between gap-1 font-mono font-bold text-sm text-foreground">
                                    <span>{vietQrInfo.accountNumber}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() =>
                                        copyToClipboard(vietQrInfo.accountNumber || "", "stk")
                                      }
                                    >
                                      {copiedField === "stk" ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-muted-foreground text-[11px]">Chủ tài khoản:</p>
                                  <p className="font-semibold uppercase text-foreground">
                                    {vietQrInfo.accountHolder || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-muted-foreground text-[11px]">Nội dung CK:</p>
                                  <div className="flex items-center justify-between gap-1 font-mono font-medium bg-muted/60 px-2 py-1 rounded">
                                    <span className="truncate">{vietQrInfo.memo}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 shrink-0"
                                      onClick={() => copyToClipboard(vietQrInfo.memo, "memo")}
                                    >
                                      {copiedField === "memo" ? (
                                        <Check className="h-3 w-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground italic text-center">
                              Mã QR đã tích hợp sẵn số tiền {formatCurrency(Number(payAmount) || 0)} và nội dung nhận diện.
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                            <div>
                              <p className="font-semibold">Cửa hàng chưa cài đặt VietQR</p>
                              <p className="mt-0.5 text-muted-foreground text-[11px]">
                                Để khách hàng có thể quét mã QR thanh toán nhanh, hãy cập nhật thông tin ngân hàng trong cài đặt.
                              </p>
                              <Button
                                asChild
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs text-blue-600 mt-1 inline-flex items-center gap-1"
                              >
                                <Link href="/settings">
                                  Đi tới Cài đặt ngân hàng <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        )}
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

      {/* ── Modal Phóng To VietQR Tận Dụng Từ Đơn Hàng ── */}
      {vietQrInfo && (
        <VietQRModal
          open={qrZoomOpen}
          onOpenChange={setQrZoomOpen}
          qrUrl={vietQrInfo.qrUrl}
          bankName={vietQrInfo.bank?.name}
          bankShortName={vietQrInfo.bank?.shortName}
          accountNumber={vietQrInfo.accountNumber}
          accountHolder={vietQrInfo.accountHolder}
          amount={vietQrInfo.amount}
          memo={vietQrInfo.memo}
          title="Quét mã VietQR thanh toán nợ"
          description="Quét mã qua bất kỳ App ngân hàng nào (Napas247 miễn phí)"
          confirmButtonText="Xác nhận đã nhận tiền & Hoàn tất"
          onConfirm={handleInlinePayment}
          confirmLoading={paymentMutation.isPending}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}
