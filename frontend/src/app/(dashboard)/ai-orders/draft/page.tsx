"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  RefreshCcw,
  ShoppingCart,
  Square,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useToast, ToastViewport } from "@/components/ui/toast";
import {
  useDraftOrders,
  useConfirmDraftOrder,
  type DraftOrder,
  type DraftOrderListParams,
  type DraftOrderStatus,
} from "@/hooks/useAiOrder";

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

function itemsSummary(draft: DraftOrder): { text: string; count: number } {
  const items = draft.items ?? [];
  const count = items.reduce((s, it) => s + it.quantity, 0);
  const names = items.map((it) => it.productName).slice(0, 2);
  const text =
    names.length > 0
      ? `${names.join(", ")}${items.length > 2 ? ` +${items.length - 2}` : ""}`
      : "—";
  return { text, count };
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  DraftOrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Chờ duyệt",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400",
  },
  confirmed: {
    label: "Đã xác nhận",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  rejected: {
    label: "Đã từ chối",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400",
  },
};

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

export default function DraftOrdersPage() {
  const router = useRouter();
  const { toasts, showToast, dismiss } = useToast();

  const [params, setParams] = useState<DraftOrderListParams>({
    status: "all",
    page: 1,
    limit: 10,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch, isFetching } = useDraftOrders(params);
  const confirmMutation = useConfirmDraftOrder();

  const drafts = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  // Chỉ cho phép select pending drafts
  const pendingDrafts = drafts.filter((d) => d.status === "pending");
  const allPendingSelected =
    pendingDrafts.length > 0 &&
    pendingDrafts.every((d) => selectedIds.has(d.id));

  // ── Selection handlers ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingDrafts.map((d) => d.id)));
    }
  }, [allPendingSelected, pendingDrafts]);

  // ── Bulk confirm ──
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);

  const handleBulkConfirm = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsBulkConfirming(true);
    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        await confirmMutation.mutateAsync(id);
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsBulkConfirming(false);
    setSelectedIds(new Set());

    if (successCount > 0) {
      showToast(
        "success",
        `Đã xác nhận ${successCount} đơn`,
        errorCount > 0 ? `${errorCount} đơn thất bại` : undefined,
      );
    } else {
      showToast("error", "Thất bại", "Không thể xác nhận đơn đã chọn.");
    }

    refetch();
  }, [selectedIds, confirmMutation, showToast, refetch]);

  // ── Single confirm ──
  const handleConfirm = useCallback(
    (id: string) => {
      confirmMutation.mutate(id, {
        onSuccess: () => {
          showToast("success", "Đã xác nhận", "Đơn nháp đã chuyển thành đơn chính thức.");
          refetch();
        },
        onError: () => {
          showToast("error", "Thất bại", "Không thể xác nhận đơn nháp.");
        },
      });
    },
    [confirmMutation, showToast, refetch],
  );

  const handleStatusChange = (value: string) => {
    setParams((p) => ({
      ...p,
      status: value as DraftOrderListParams["status"],
      page: 1,
    }));
    setSelectedIds(new Set());
  };

  const handlePageChange = (newPage: number) => {
    setParams((p) => ({ ...p, page: newPage }));
    setSelectedIds(new Set());
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
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/ai-orders")}
            className="h-9 w-9 shrink-0"
            aria-label="Quay lại chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Đơn nháp AI
            </h1>
            <p className="mt-1 text-muted-foreground">
              Quản lý tất cả đơn nháp được AI tạo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/ai-orders")}
            variant="outline"
            className="gap-1.5 font-semibold"
          >
            <MessageSquare className="h-4 w-4" />
            Chat AI
          </Button>
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="font-semibold"
          >
            <RefreshCcw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
            />
            Làm mới
          </Button>
        </div>
      </motion.div>

      {/* ── Toolbar ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        {/* Status filter */}
        <Select value={params.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full lg:w-[200px]" id="draft-status-filter">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="rejected">Đã từ chối</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Button
              onClick={handleBulkConfirm}
              disabled={isBulkConfirming}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-sm shadow-emerald-500/25 hover:from-emerald-500 hover:to-emerald-400"
            >
              {isBulkConfirming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Xác nhận {selectedIds.size} đơn đã chọn
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground"
            >
              Bỏ chọn
            </Button>
          </motion.div>
        )}

        <p className="text-sm text-muted-foreground lg:ml-auto">
          Hiển thị{" "}
          <span className="font-medium text-foreground">{drafts.length}</span> /{" "}
          <span className="font-medium text-foreground">{total}</span> đơn nháp
        </p>
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        variants={itemVariants}
        className="overflow-hidden rounded-2xl border bg-card/50 shadow-sm backdrop-blur-sm"
      >
        {isLoading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[140px]" />
                <Skeleton className="h-4 w-[220px]" />
                <Skeleton className="h-4 w-[110px]" />
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-6 w-[80px]" />
                <Skeleton className="h-6 w-[80px]" />
              </div>
            ))}
          </div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-20">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="mb-6 rounded-full bg-muted p-6"
            >
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            </motion.div>
            <h3 className="text-lg font-semibold">Chưa có đơn nháp</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Sử dụng AI Chat để tạo đơn hàng bằng giọng nói hoặc văn bản.
            </p>
            <Button
              onClick={() => router.push("/ai-orders")}
              className="mt-4 gap-1.5 bg-gradient-to-r from-violet-600 to-blue-600 font-semibold text-white"
            >
              <MessageSquare className="h-4 w-4" />
              Mở Chat AI
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    {/* Checkbox */}
                    <TableHead className="sticky top-0 w-[50px]">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Chọn tất cả"
                      >
                        {allPendingSelected && pendingDrafts.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[100px]">
                      ID
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[150px]">
                      Khách hàng
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[220px]">
                      Sản phẩm
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[130px] text-right">
                      Tổng tiền
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[140px]">
                      Ngày tạo
                    </TableHead>
                    <TableHead className="sticky top-0 min-w-[100px] text-center">
                      Trạng thái
                    </TableHead>
                    <TableHead className="sticky top-0 w-[100px] text-center">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft, index) => {
                    const badge = STATUS_BADGE[draft.status];
                    const summary = itemsSummary(draft);
                    const isSelected = selectedIds.has(draft.id);
                    const isPending = draft.status === "pending";

                    return (
                      <motion.tr
                        key={draft.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={cn(
                          "group border-b transition-colors hover:bg-muted/40",
                          isSelected && "bg-blue-50/50 dark:bg-blue-950/20",
                        )}
                      >
                        {/* Checkbox */}
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => isPending && toggleSelect(draft.id)}
                            className={cn(
                              "flex items-center justify-center transition-colors",
                              isPending
                                ? "text-muted-foreground hover:text-foreground cursor-pointer"
                                : "text-muted-foreground/30 cursor-not-allowed",
                            )}
                            disabled={!isPending}
                            aria-label={`Chọn đơn ${draft.id}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>

                        {/* ID */}
                        <TableCell>
                          <span className="font-mono text-sm font-semibold text-violet-600 dark:text-violet-400">
                            #{draft.id.slice(-3)}
                          </span>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          {draft.customerName ? (
                            <p className="font-medium">{draft.customerName}</p>
                          ) : (
                            <span className="text-muted-foreground">
                              Khách vãng lai
                            </span>
                          )}
                        </TableCell>

                        {/* Items Summary */}
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

                        {/* Total */}
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatCurrency(draft.totalAmount)}
                        </TableCell>

                        {/* Created At */}
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(draft.createdAt)}
                            <span className="text-muted-foreground/50">
                              {
                                formatDateTime(draft.createdAt).split(", ")[1]
                              }
                            </span>
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={badge.className}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-center">
                          {isPending ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirm(draft.id)}
                              disabled={confirmMutation.isPending}
                              className="h-8 gap-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                            >
                              {confirmMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Duyệt
                            </Button>
                          ) : draft.status === "confirmed" ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              ✓ Đã duyệt
                            </span>
                          ) : (
                            <span className="text-xs text-red-500">
                              <XCircle className="mr-1 inline h-3 w-3" />
                              Bị từ chối
                            </span>
                          )}
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

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </motion.div>
  );
}
