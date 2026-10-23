"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import {
  Banknote,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  StickyNote,
  Printer,
  Receipt,
  ExternalLink,
  Clock,
  RefreshCw,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRecordDebtPayment } from "@/hooks/useCustomers";
import type { Customer } from "@/hooks/useCustomers";
import { useCurrentStore } from "@/hooks/useStore";
import {
  useCreateOrderStripeSession,
  useOrderStripeSessionStatus,
  type OrderStripeSessionData,
} from "@/hooks/useOrders";
import {
  printDebtReceiptPDF,
  printDebtReceiptThermal,
  type DebtReceiptData,
} from "@/lib/debtReceipt";

// ── Helper ────────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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

// ── Schema ────────────────────────────────────────────────────────────────────

function createPaymentSchema(maxAmount: number) {
  return z.object({
    amount: z
      .number({ error: "Vui lòng nhập số tiền" })
      .min(1000, "Số tiền tối thiểu 1,000₫")
      .max(maxAmount, `Số tiền không được vượt quá ${formatCurrency(maxAmount)}`),
    paymentMethod: z.enum(["cash", "stripe", "transfer"] as const, {
      error: "Chọn phương thức thanh toán",
    }),
    note: z.string().max(500, "Ghi chú không quá 500 ký tự").optional(),
  });
}

type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface DebtPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DebtPaymentDialog({
  open,
  onOpenChange,
  customer,
}: DebtPaymentDialogProps) {
  const { data: store } = useCurrentStore();
  const paymentMutation = useRecordDebtPayment();
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    paidAmount: number;
    remainingDebt: number;
    paymentMethod: "cash" | "stripe" | "transfer";
    note?: string;
  } | null>(null);

  // Stripe Payment State
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeSession, setStripeSession] = useState<OrderStripeSessionData | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const createStripeSessionMutation = useCreateOrderStripeSession();
  const {
    data: stripeStatus,
    refetch: refetchStripeStatus,
    isFetching: isCheckingStripe,
  } = useOrderStripeSessionStatus(stripeSession?.sessionId, stripeModalOpen);

  const autoSubmittedRef = useRef(false);

  const debtBalance = customer?.debtBalance ?? 0;
  const schema = createPaymentSchema(debtBalance);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: undefined,
      paymentMethod: "cash",
      note: "",
    },
  });

  const watchAmount = watch("amount");
  const watchMethod = watch("paymentMethod");

  useEffect(() => {
    if (!open) {
      reset({ amount: undefined, paymentMethod: "cash", note: "" });
      setShowSuccess(false);
      setLastPayment(null);
      setStripeModalOpen(false);
      setStripeSession(null);
      setStripeError(null);
      autoSubmittedRef.current = false;
    }
  }, [open, reset]);

  // Handle open Stripe checkout modal & generate QR session
  const handleOpenStripeModal = useCallback(async () => {
    if (!customer) return;
    const amount = Number(watchAmount);
    if (!amount || amount < 1000) {
      return;
    }
    setStripeError(null);
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
    } catch (err: any) {
      setStripeError(err?.message || "Không thể khởi tạo phiên thanh toán Stripe");
    }
  }, [customer, watchAmount, createStripeSessionMutation]);

  const onSubmit = async (data: PaymentFormValues) => {
    if (!customer) return;

    // Double Guard: Không cho phép xác nhận nợ Stripe nếu chưa nhận được thanh toán
    if (data.paymentMethod === "stripe" && !stripeStatus?.isPaid) {
      handleOpenStripeModal();
      return;
    }

    try {
      await paymentMutation.mutateAsync({
        customerId: customer.id,
        data: {
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          note: data.note,
        },
      });

      setLastPayment({
        paidAmount: data.amount,
        remainingDebt: Math.max(0, debtBalance - data.amount),
        paymentMethod: data.paymentMethod,
        note: data.note,
      });

      setStripeModalOpen(false);
      setShowSuccess(true);
    } catch {
      // Error handled by mutation
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
      watchMethod === "stripe" &&
      stripeModalOpen &&
      !autoSubmittedRef.current &&
      !paymentMutation.isPending
    ) {
      autoSubmittedRef.current = true;
      handleSubmit(onSubmit)();
    }
  }, [stripeStatus?.isPaid, watchMethod, stripeModalOpen]);

  const handlePrintPDF = () => {
    if (!customer || !lastPayment) return;
    const receiptData: DebtReceiptData = {
      storeName: store?.name || "BizFlow 3D",
      storeAddress: store?.address || undefined,
      storePhone: store?.phone || undefined,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      previousDebt: debtBalance,
      paidAmount: lastPayment.paidAmount,
      remainingDebt: lastPayment.remainingDebt,
      paymentMethod: lastPayment.paymentMethod,
      note: lastPayment.note,
    };
    printDebtReceiptPDF(receiptData);
  };

  const handlePrintThermal = () => {
    if (!customer || !lastPayment) return;
    const receiptData: DebtReceiptData = {
      storeName: store?.name || "BizFlow 3D",
      storeAddress: store?.address || undefined,
      storePhone: store?.phone || undefined,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      previousDebt: debtBalance,
      paidAmount: lastPayment.paidAmount,
      remainingDebt: lastPayment.remainingDebt,
      paymentMethod: lastPayment.paymentMethod,
      note: lastPayment.note,
    };
    printDebtReceiptThermal(receiptData);
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
          <AnimatePresence mode="wait">
            {showSuccess && lastPayment ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-6 text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="rounded-full bg-emerald-500/10 p-4 text-emerald-500"
                >
                  <CheckCircle2 className="h-16 w-16" />
                </motion.div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Thanh toán thành công!
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Số dư công nợ của khách hàng đã được cập nhật chính xác.
                  </p>
                </div>

                {/* Summary card */}
                <div className="w-full rounded-xl border bg-muted/40 p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Khách hàng:</span>
                    <span className="font-semibold">{customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tiền đã thu:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(lastPayment.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hình thức:</span>
                    <span className="font-medium">
                      {lastPayment.paymentMethod === "stripe"
                        ? "Cổng Stripe (Thẻ & QR)"
                        : lastPayment.paymentMethod === "transfer"
                          ? "Chuyển khoản ngân hàng"
                          : "Tiền mặt"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Công nợ còn lại:</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency(lastPayment.remainingDebt)}
                    </span>
                  </div>
                </div>

                {/* Action buttons for printing receipts */}
                <div className="w-full pt-2 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-2 font-medium"
                      onClick={handlePrintThermal}
                    >
                      <Receipt className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      In nhiệt (K80)
                    </Button>
                    <Button
                      type="button"
                      className="h-11 gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-md shadow-blue-500/20"
                      onClick={handlePrintPDF}
                    >
                      <Printer className="h-4 w-4" />
                      In phiếu thu (PDF)
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => onOpenChange(false)}
                  >
                    Đóng cửa sổ
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">
                    Ghi nhận thu nợ khách hàng
                  </DialogTitle>
                  <DialogDescription>
                    Tạo phiếu thu giảm trừ số dư công nợ của khách hàng.
                  </DialogDescription>
                </DialogHeader>

                {/* Customer summary banner */}
                <div className="mt-4 flex items-center justify-between rounded-xl border bg-card p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                      <AvatarFallback className="bg-primary/10 font-bold text-primary text-sm">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-sm leading-tight text-foreground">
                        {customer.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {customer.phone || customer.email || "Không có SĐT"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Dư nợ hiện tại
                    </span>
                    <span className="text-base font-extrabold text-red-500">
                      {formatCurrency(debtBalance)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                  {/* Amount input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="payment-amount" className="text-sm font-medium">
                        Số tiền thanh toán <span className="text-red-500">*</span>
                      </Label>
                      {debtBalance > 0 && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-primary hover:underline"
                          onClick={() =>
                            setValue("amount", debtBalance, { shouldValidate: true })
                          }
                        >
                          Trả toàn bộ ({formatCurrency(debtBalance)})
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Input
                        id="payment-amount"
                        type="number"
                        placeholder="0"
                        className="pl-8 text-base font-semibold"
                        {...register("amount", { valueAsNumber: true })}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                        ₫
                      </span>
                    </div>

                    {errors.amount && (
                      <p className="text-xs text-red-500 font-medium">
                        {errors.amount.message}
                      </p>
                    )}

                    {/* Quick percentage buttons */}
                    <div className="flex gap-1.5 pt-1">
                      {[
                        { label: "25%", value: Math.round(debtBalance * 0.25) },
                        { label: "50%", value: Math.round(debtBalance * 0.5) },
                        { label: "75%", value: Math.round(debtBalance * 0.75) },
                        { label: "100%", value: debtBalance },
                      ]
                        .filter((b) => b.value > 0)
                        .map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
                            onClick={() => setValue("amount", b.value, { shouldValidate: true })}
                          >
                            {b.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Phương thức thanh toán <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      defaultValue="cash"
                      onValueChange={(val) =>
                        setValue("paymentMethod", val as "cash" | "stripe")
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn phương thức" />
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

                  {/* ── Stripe Dynamic Section ── */}
                  {watchMethod === "stripe" && (
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
                                {formatCurrency(watchAmount || 0)}
                              </span>
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Trạng thái:</span>
                              {stripeStatus?.isPaid ? (
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
                            disabled={createStripeSessionMutation.isPending || !watchAmount || watchAmount < 1000}
                            className="shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
                          >
                            {createStripeSessionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <QrCode className="h-4 w-4" />
                            )}
                            {stripeSession ? "Xem mã QR Stripe" : "Mở mã QR Stripe"}
                          </Button>
                        </div>

                        <p className="text-[11px] text-muted-foreground italic text-center">
                          Hệ thống tự động tra soát giao dịch real-time và cập nhật đơn công nợ ngay khi khách thanh toán thành công.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Note */}
                  <div className="space-y-2">
                    <Label htmlFor="payment-note" className="text-sm font-medium">
                      Ghi chú phiếu thu
                    </Label>
                    <div className="relative">
                      <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="payment-note"
                        placeholder="Ghi chú chi tiết đợt thanh toán nợ..."
                        className="min-h-[65px] pl-9 resize-none text-sm"
                        {...register("note")}
                      />
                    </div>
                  </div>

                  {/* Remaining balance preview */}
                  {watchAmount > 0 && (
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
                        <strong className="text-base text-amber-800 dark:text-amber-200 font-bold">
                          {formatCurrency(
                            Math.max(0, debtBalance - (watchAmount || 0))
                          )}
                        </strong>
                      </div>
                    </motion.div>
                  )}

                  <DialogFooter className="pt-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={paymentMutation.isPending}
                    >
                      Hủy
                    </Button>

                    {watchMethod === "stripe" && !stripeStatus?.isPaid ? (
                      <Button
                        type="button"
                        onClick={handleOpenStripeModal}
                        disabled={!watchAmount || watchAmount < 1000 || createStripeSessionMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 font-semibold text-white shadow-lg shadow-indigo-500/25"
                      >
                        {createStripeSessionMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            Đang tạo mã QR...
                          </>
                        ) : (
                          <>
                            <QrCode className="h-4 w-4 mr-1.5" />
                            Mở mã QR Stripe ({formatCurrency(watchAmount || 0)})
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={paymentMutation.isPending || !watchAmount || watchAmount <= 0}
                        className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/40"
                      >
                        {paymentMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            Đang xử lý...
                          </>
                        ) : watchMethod === "stripe" && stripeStatus?.isPaid ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Đã nhận Stripe · Ghi nhận ngay
                          </>
                        ) : (
                          "Ghi nhận thanh toán"
                        )}
                      </Button>
                    )}
                  </DialogFooter>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

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
                {formatCurrency(watchAmount || 0)}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Khách hàng: <strong>{customer.name}</strong>
              </span>
            </div>

            {/* QR Code Container */}
            <div className="relative p-3.5 bg-white rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 shadow-md">
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
            </div>

            {/* Status & Actions */}
            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        stripeStatus?.isPaid ? "bg-emerald-400" : "bg-amber-400"
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        stripeStatus?.isPaid ? "bg-emerald-500" : "bg-amber-500"
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
                        : "text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {stripeStatus?.isPaid ? "Thành công (Paid)" : "Chờ thanh toán..."}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => refetchStripeStatus()}
                    disabled={isCheckingStripe}
                    title="Kiểm tra trạng thái ngay"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isCheckingStripe ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>

              {stripeSession?.checkoutUrl && (
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

              {/* Locked Confirmation Button until Paid */}
              <Button
                type="button"
                className={`w-full font-semibold transition-all shadow-md ${
                  stripeStatus?.isPaid
                    ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/25"
                    : "bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
                }`}
                disabled={!stripeStatus?.isPaid || paymentMutation.isPending}
                onClick={handleSubmit(onSubmit)}
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
    </>
  );
}
