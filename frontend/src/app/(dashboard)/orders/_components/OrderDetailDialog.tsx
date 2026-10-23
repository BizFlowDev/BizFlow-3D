"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Printer,
  QrCode,
  ReceiptText,
  ShoppingCart,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useOrderDetail,
  useConfirmOrder,
  useCancelOrder,
  getOrderCode,
} from "@/hooks/useOrders";
import { printInvoice } from "@/lib/invoice";
import type { ToastType } from "@/components/ui/toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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

export function statusBadge(status: "draft" | "confirmed" | "cancelled") {
  if (status === "confirmed") {
    return {
      label: "Đã xác nhận",
      className:
        "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
    };
  }
  if (status === "cancelled") {
    return {
      label: "Đã hủy",
      className:
        "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400",
    };
  }
  return {
    label: "Nháp",
    className:
      "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
  };
}

export function paymentMethodBadge(method?: string) {
  if (method === "stripe") {
    return {
      label: "Cổng Stripe",
      icon: CreditCard,
      className:
        "bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400",
    };
  }
  if (method === "qr_code") {
    return {
      label: "Quét mã QR",
      icon: QrCode,
      className:
        "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400",
    };
  }
  if (method === "debt") {
    return {
      label: "Ghi nợ",
      icon: FileText,
      className:
        "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400",
    };
  }
  return {
    label: "Tiền mặt",
    icon: Banknote,
    className:
      "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrderDetailDialog({
  open,
  onOpenChange,
  orderId,
  showToast,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  showToast: (type: ToastType, title: string, description?: string) => void;
}) {
  const { data: order, isLoading } = useOrderDetail(orderId ?? "");
  const confirmMutation = useConfirmOrder();
  const cancelMutation = useCancelOrder();
  const [printing, setPrinting] = useState(false);

  const badge = order ? statusBadge(order.status) : null;

  const handleConfirm = () => {
    if (!order) return;
    confirmMutation.mutate(order.id, {
      onSuccess: (updated) => {
        showToast(
          "success",
          "Xác nhận đơn hàng",
          `Đơn ${getOrderCode(updated)} đã được xác nhận.`,
        );
        onOpenChange(false);
      },
      onError: () =>
        showToast("error", "Xác nhận thất bại", "Vui lòng thử lại."),
    });
  };

  const handleCancel = () => {
    if (!order) return;
    cancelMutation.mutate(order.id, {
      onSuccess: (updated) => {
        showToast(
          "info",
          "Hủy đơn hàng",
          `Đơn ${getOrderCode(updated)} đã bị hủy.`,
        );
        onOpenChange(false);
      },
      onError: () => showToast("error", "Hủy thất bại", "Vui lòng thử lại."),
    });
  };

  const handlePrint = async () => {
    if (!order) return;
    setPrinting(true);
    try {
      await printInvoice(order);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-blue-600" />
            Chi tiết đơn hàng
            {badge && (
              <Badge variant="secondary" className={badge.className}>
                {badge.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {order
              ? `${getOrderCode(order)} · Tạo lúc ${formatDateTime(order.createdAt)}`
              : "Đang tải thông tin đơn hàng..."}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !order ? (
          <div className="space-y-3 py-2">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-36" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <InfoItem
                icon={User}
                label="Khách hàng"
                value={
                  order.customerName
                    ? `${order.customerName}${order.customerPhone ? ` (${order.customerPhone})` : ""}`
                    : "Khách vãng lai"
                }
              />
              <InfoItem
                icon={Banknote}
                label="Tổng tiền"
                value={formatCurrency(order.finalAmount)}
                highlight
              />
              <InfoItem
                icon={AlertTriangle}
                label="Ghi nợ"
                value={
                  order.debtAmount > 0
                    ? formatCurrency(order.debtAmount)
                    : "Đã thanh toán"
                }
                danger={order.debtAmount > 0}
              />
              <InfoItem
                icon={
                  order.paymentMethod === "stripe"
                    ? CreditCard
                    : order.paymentMethod === "qr_code"
                      ? QrCode
                      : order.paymentMethod === "debt"
                        ? FileText
                        : Banknote
                }
                label="Hình thức TT"
                value={paymentMethodBadge(order.paymentMethod).label}
              />
              <InfoItem
                icon={Clock}
                label="Trạng thái"
                value={badge?.label ?? order.status}
              />
              <InfoItem
                icon={ReceiptText}
                label="Mã đơn"
                value={getOrderCode(order)}
              />
            </div>

            {order.note && (
              <p className="rounded-lg border bg-muted/30 p-2.5 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Ghi chú: </span>
                {order.note}
              </p>
            )}

            {/* Items table */}
            <div className="overflow-hidden rounded-xl border">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="min-w-[180px]">Sản phẩm</TableHead>
                      <TableHead className="text-center">SL</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(order.items ?? []).map((it, i) => (
                      <motion.tr
                        key={it.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <TableCell>
                          <p className="font-medium">{it.productName ?? "Sản phẩm"}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.unitName ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {it.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(it.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(it.totalPrice)}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Totals */}
              <div className="space-y-1.5 border-t bg-muted/20 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính</span>
                  <span className="tabular-nums font-mono">{formatCurrency(order.totalAmount)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Giảm giá</span>
                    <span className="tabular-nums font-mono text-emerald-600">
                      −{formatCurrency(order.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t pt-1.5">
                  <span>Tổng cộng</span>
                  <span className="tabular-nums font-mono text-blue-600">
                    {formatCurrency(order.finalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t text-xs">
                  <span className="text-muted-foreground">Hình thức thanh toán:</span>
                  <Badge variant="secondary" className={paymentMethodBadge(order.paymentMethod).className}>
                    {paymentMethodBadge(order.paymentMethod).label}
                  </Badge>
                </div>
                {order.paymentMethod === "cash" && (order.paidAmount !== undefined || order.changeAmount !== undefined) && (
                  <>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tiền khách đưa:</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency((order.paidAmount || 0) + (order.changeAmount || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>Tiền thừa trả khách:</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(order.changeAmount || 0)}
                      </span>
                    </div>
                  </>
                )}
                {order.debtAmount > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-red-500">
                    <span>Ghi nợ:</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(order.debtAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            {order?.status === "draft" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  className="text-red-600 hover:text-red-600"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Hủy đơn
                </Button>
                <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Xác nhận
                </Button>
              </>
            )}
            {order && order.status === "confirmed" && (
              <Button variant="outline" onClick={handlePrint} disabled={printing}>
                {printing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                In hóa đơn
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  highlight = false,
  danger = false,
}: {
  icon: typeof User;
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        highlight && "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20",
        danger && "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20",
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-sm font-semibold",
          highlight && "text-blue-600",
          danger && "text-red-600",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
