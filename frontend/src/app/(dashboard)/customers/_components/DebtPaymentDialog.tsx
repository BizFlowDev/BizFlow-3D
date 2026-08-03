"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
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
    paymentMethod: z.enum({"cash": "cash", "transfer": "transfer"} as const, {
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
  const paymentMutation = useRecordDebtPayment();
  const [showSuccess, setShowSuccess] = useState(false);

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

  useEffect(() => {
    if (!open) {
      reset({ amount: undefined, paymentMethod: "cash", note: "" });
      setShowSuccess(false);
    }
  }, [open, reset]);

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
      setShowSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setShowSuccess(false);
      }, 1500);
    } catch {
      // Error handled by mutation
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] overflow-hidden rounded-2xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="rounded-full bg-emerald-500/10 p-4"
              >
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-lg font-semibold"
              >
                Thanh toán thành công!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-1 text-sm text-muted-foreground"
              >
                Số dư nợ đã được cập nhật.
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Banknote className="h-5 w-5 text-blue-500" />
                  Ghi nhận thanh toán nợ
                </DialogTitle>
                <DialogDescription>
                  Ghi nhận khoản thanh toán nợ cho khách hàng.
                </DialogDescription>
              </DialogHeader>

              {/* Customer Info */}
              <div className="mt-5 flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-bold text-white">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Nợ hiện tại</p>
                  <p className="text-lg font-bold text-red-500">
                    {formatCurrency(debtBalance)}
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-5 space-y-5"
              >
                {/* Amount */}
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
                      className="pl-9 pr-12"
                      {...register("amount", { valueAsNumber: true })}
                      aria-invalid={errors.amount ? "true" : "false"}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      VNĐ
                    </span>
                  </div>
                  {errors.amount && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.amount.message}
                    </p>
                  )}
                  {/* Quick amount buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Toàn bộ", value: debtBalance },
                      { label: "50%", value: Math.round(debtBalance / 2) },
                      { label: "1 triệu", value: 1000000 },
                      { label: "500K", value: 500000 },
                    ]
                      .filter((b) => b.value > 0 && b.value <= debtBalance)
                      .map((b) => (
                        <button
                          key={b.label}
                          type="button"
                          className="rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                          onClick={() => setValue("amount", b.value)}
                        >
                          {b.label}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Phương thức <span className="text-red-500">*</span>
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
                  {errors.paymentMethod && (
                    <p className="text-xs text-red-500" role="alert">
                      {errors.paymentMethod.message}
                    </p>
                  )}
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label htmlFor="payment-note" className="text-sm font-medium">
                    Ghi chú
                  </Label>
                  <div className="relative">
                    <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="payment-note"
                      placeholder="Ghi chú thanh toán..."
                      className="min-h-[70px] pl-9 resize-none"
                      {...register("note")}
                    />
                  </div>
                </div>

                {/* Remaining balance preview */}
                {watchAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="overflow-hidden rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-700 dark:text-amber-300">
                        Nợ còn lại sau thanh toán:{" "}
                        <strong>
                          {formatCurrency(
                            Math.max(0, debtBalance - (watchAmount || 0))
                          )}
                        </strong>
                      </span>
                    </div>
                  </motion.div>
                )}

                <DialogFooter className="pt-2">
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
                    disabled={paymentMutation.isPending}
                    className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/40"
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
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
