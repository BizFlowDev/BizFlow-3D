"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  ReceiptText,
  RefreshCcw,
  ShoppingCart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrderList, getOrderCode, type Order, type OrderListParams } from "@/hooks/useOrders";
import { useToast, ToastViewport } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import OrderDetailDialog, { statusBadge, paymentMethodBadge } from "./_components/OrderDetailDialog";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
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

function itemsSummary(order: Order): { text: string; count: number } {
  const items = order.items ?? [];
  const count = items.reduce((s, it) => s + it.quantity, 0);
  const names = items.map((it) => it.productName ?? "SP").slice(0, 2);
  const text =
    names.length > 0
      ? `${names.join(", ")}${items.length > 2 ? ` +${items.length - 2}` : ""}`
      : "—";
  return { text, count };
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

// ── Page Component ────────────────────────────────────────────────────────────

export default function OrdersContent() {
  const { toasts, showToast, dismiss } = useToast();
  const [params, setParams] = useState<OrderListParams>({
    status: "all",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 10,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useOrderList(params);
  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  const handleOpenDetail = (order: Order) => {
    setSelectedId(order.id);
    setDetailOpen(true);
  };

  const handleStatusChange = (value: string) => {
    setParams((p) => ({
      ...p,
      status: value as OrderListParams["status"],
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
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
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Đơn hàng
          </h1>
          <p className="mt-1 text-muted-foreground">
            Danh sách đơn hàng tại quầy và đơn nháp.
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="lg"
          disabled={isFetching}
          className="font-semibold"
        >
          <RefreshCcw
            className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Làm mới
        </Button>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        {/* Status filter */}
        <Select value={params.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full lg:w-[200px]" id="order-status-filter">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="draft">Nháp</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            type="date"
            value={params.fromDate ?? ""}
            max={params.toDate || undefined}
            onChange={(e) =>
              setParams((p) => ({ ...p, fromDate: e.target.value, page: 1 }))
            }
            aria-label="Từ ngày"
            className="w-full lg:w-[160px]"
          />
          <span className="text-muted-foreground">→</span>
          <Input
            type="date"
            value={params.toDate ?? ""}
            min={params.fromDate || undefined}
            onChange={(e) =>
              setParams((p) => ({ ...p, toDate: e.target.value, page: 1 }))
            }
            aria-label="Đến ngày"
            className="w-full lg:w-[160px]"
          />
        </div>

        <p className="text-sm text-muted-foreground lg:ml-auto">
          Hiển thị{" "}
          <span className="font-medium text-foreground">{orders.length}</span> /{" "}
          <span className="font-medium text-foreground">{total}</span> đơn hàng
        </p>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-2xl border bg-card/50 shadow-sm backdrop-blur-sm"
      >
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-4 w-[180px]" />
                <Skeleton className="h-4 w-[220px]" />
                <Skeleton className="h-6 w-[110px]" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-6 w-[60px]" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="rounded-full bg-muted p-6 mb-6"
            >
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Chưa có đơn hàng</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="sticky top-0 min-w-[140px]">
                      Mã đơn
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[150px]">
                      Khách hàng
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[200px]">
                      Sản phẩm
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px]">
                      Thanh toán
                    </TableHead>
                    <TableHead className="sticky top-0 text-right min-w-[120px]">
                      Tổng tiền
                    </TableHead>
                    <TableHead className="sticky top-0 text-center min-w-[100px]">
                      Trạng thái
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px]">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="sticky top-0 text-center w-[70px]">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, index) => {
                    const badge = statusBadge(order.status);
                    const payBadge = paymentMethodBadge(order.paymentMethod);
                    const PayIcon = payBadge.icon;
                    const summary = itemsSummary(order);
                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => handleOpenDetail(order)}
                        className="group cursor-pointer border-b transition-colors hover:bg-muted/40"
                      >
                        {/* Mã đơn */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-600">
                            <ReceiptText className="h-3.5 w-3.5" />
                            {getOrderCode(order)}
                          </span>
                        </TableCell>

                        {/* Khách hàng */}
                        <TableCell>
                          {order.customerName ? (
                            <div>
                              <p className="font-medium">{order.customerName}</p>
                              {order.debtAmount > 0 && (
                                <p className="text-xs font-semibold text-red-500">
                                  Ghi nợ {formatCurrency(order.debtAmount)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Khách vãng lai
                            </span>
                          )}
                        </TableCell>

                        {/* Sản phẩm */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p
                              className="truncate text-sm text-muted-foreground"
                              title={summary.text}
                            >
                              {summary.text}
                            </p>
                            <Badge
                              variant="secondary"
                              className="shrink-0 gap-1 bg-muted text-muted-foreground"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              {summary.count}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Hình thức thanh toán */}
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("gap-1 text-[11px] font-medium", payBadge.className)}
                          >
                            <PayIcon className="h-3 w-3" />
                            {payBadge.label}
                          </Badge>
                        </TableCell>

                        {/* Tổng tiền */}
                        <TableCell className="text-right font-semibold tabular-nums font-mono">
                          {formatCurrency(order.finalAmount)}
                        </TableCell>

                        {/* Trạng thái */}
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={badge.className}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>

                        {/* Ngày tạo */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(order.createdAt)}
                          </span>
                        </TableCell>

                        {/* Thao tác */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(order);
                            }}
                            aria-label="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                Trang{" "}
                <span className="font-medium">{currentPage}</span> /{" "}
                <span className="font-medium">{totalPages}</span>
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

      {/* ── Detail dialog ── */}
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
