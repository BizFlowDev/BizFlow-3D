"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  StickyNote,
  QrCode,
  Copy,
  Check,
  Printer,
  Receipt,
  ExternalLink,
  ShieldAlert,
  Maximize2,
} from "lucide-react";
import { VietQRModal } from "@/components/shared/VietQRModal";
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
import { generateVietQRUrl, getBankByCode, formatPaymentMemo } from "@/lib/vietqr";
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
    paymentMethod: z.enum(["cash", "transfer"] as const, {
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
    paymentMethod: "cash" | "transfer";
    note?: string;
  } | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrZoomOpen, setQrZoomOpen] = useState(false);

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
      setCopiedField(null);
      setQrZoomOpen(false);
    }
  }, [open, reset]);

  // VietQR generation memoization
  const vietQrInfo = useMemo(() => {
    if (!store?.bankCode || !store?.bankAccountNumber || !customer) return null;

    const bank = getBankByCode(store.bankCode);
    const memo = formatPaymentMemo(customer.code || customer.name, "TT NO");
    const amount = Number(watchAmount) > 0 ? Number(watchAmount) : 0;

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
  }, [store, customer, watchAmount]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (!customer) return;
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

      setQrZoomOpen(false);
      setShowSuccess(true);
    } catch {
      // Error handled by mutation
    }
  };

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
                    {lastPayment.paymentMethod === "transfer"
                      ? "Chuyển khoản (VietQR)"
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
                <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                  <Banknote className="h-5 w-5 text-blue-500" />
                  Ghi nhận thanh toán nợ
                </DialogTitle>
                <DialogDescription>
                  Thu nợ và cập nhật hạn mức công nợ cho khách hàng.
                </DialogDescription>
              </DialogHeader>

              {/* Customer Info Card */}
              <div className="mt-4 flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                <Avatar className="h-12 w-12 border">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {customer.phone || "Không có SĐT"} · {customer.code}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Nợ hiện tại</p>
                  <p className="text-lg font-bold text-red-500">
                    {formatCurrency(debtBalance)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="payment-amount" className="text-sm font-medium">
                    Số tiền thanh toán <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Banknote className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="Nhập số tiền..."
                      className="pl-9 pr-12 text-base font-semibold"
                      {...register("amount", { valueAsNumber: true })}
                      aria-invalid={errors.amount ? "true" : "false"}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                      VNĐ
                    </span>
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.amount.message}
                    </p>
                  )}

                  {/* Quick amount buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "Toàn bộ", value: debtBalance },
                      { label: "50%", value: Math.round(debtBalance / 2) },
                      { label: "2 triệu", value: 2000000 },
                      { label: "1 triệu", value: 1000000 },
                      { label: "500K", value: 500000 },
                    ]
                      .filter((b) => b.value > 0 && b.value <= debtBalance)
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
                      setValue("paymentMethod", val as "cash" | "transfer")
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
                      <SelectItem value="transfer">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          Chuyển khoản (VietQR Napas247)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ── VietQR Dynamic Section ── */}
                {watchMethod === "transfer" && (
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

                          {/* Bank details & Copy buttons */}
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
                          Mã QR đã tích hợp sẵn số tiền {formatCurrency(watchAmount || 0)} và nội dung nhận diện.
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
                    ) : (
                      "Ghi nhận thanh toán"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>

    {/* Modal Phóng To VietQR Tận Dụng Từ Đơn Hàng */}
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
        onConfirm={handleSubmit(onSubmit)}
        confirmLoading={paymentMutation.isPending}
      />
    )}
  </>
  );
}
