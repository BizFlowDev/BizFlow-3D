"use client";

import { useState } from "react";
import {
  CreditCard,
  Search,
  RefreshCcw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  useSubscriptionOrders,
  useSyncSubscriptionOrder,
  type SubscriptionOrderParams,
} from "@/hooks/useAdmin";
import { useToast } from "@/components/ui/toast";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
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

const STATUS_BADGES: Record<
  string,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  completed: {
    label: "Thành công",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  pending: {
    label: "Chờ thanh toán",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  expired: {
    label: "Hết hạn",
    className: "bg-muted text-muted-foreground border-border",
    icon: AlertCircle,
  },
  failed: {
    label: "Thất bại",
    className: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    icon: XCircle,
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-muted text-muted-foreground border-border",
    icon: XCircle,
  },
};

export function SubscriptionOrdersSection() {
  const { showToast } = useToast();
  const { mutate: syncOrder } = useSyncSubscriptionOrder();
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

  const [params, setParams] = useState<SubscriptionOrderParams>({
    page: 1,
    limit: 15,
  });

  const { data, isLoading, refetch, isFetching } = useSubscriptionOrders(params);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = params.page ?? 1;

  const handleStatusChange = (val: string) => {
    setParams((p) => ({
      ...p,
      status: val === "all" ? undefined : val,
      page: 1,
    }));
  };

  const handleSyncOrder = (orderId: string) => {
    setSyncingOrderId(orderId);
    syncOrder(orderId, {
      onSuccess: (updated) => {
        setSyncingOrderId(null);
        if (updated.status === "completed") {
          showToast("success", `Đã đồng bộ thành công! Gói ${updated.planSlug} đã được kích hoạt.`);
        } else {
          showToast("info", `Đã kiểm tra Stripe. Trạng thái hiện tại: ${updated.status}`);
        }
      },
      onError: (err: any) => {
        setSyncingOrderId(null);
        showToast("error", err?.message || "Không thể đồng bộ với Stripe");
      },
    });
  };

  return (
    <Card className="border-0 shadow-sm bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5 text-indigo-500" />
            Lịch Sử Giao Dịch Nâng Cấp Gói (Stripe / QR)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Theo dõi danh sách các phiên thanh toán trực tuyến, trạng thái Webhook và kích hoạt bản quyền.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bộ lọc trạng thái */}
          <Select defaultValue="all" onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="completed">Thành công</SelectItem>
              <SelectItem value="pending">Chờ thanh toán</SelectItem>
              <SelectItem value="expired">Hết hạn</SelectItem>
              <SelectItem value="failed">Thất bại</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 gap-1 text-xs"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[160px] text-xs">Thời gian</TableHead>
                <TableHead className="text-xs">Mã đơn / Cửa hàng</TableHead>
                <TableHead className="text-xs">Gói & Kỳ hạn</TableHead>
                <TableHead className="text-right text-xs">Số tiền</TableHead>
                <TableHead className="text-center text-xs">Cổng</TableHead>
                <TableHead className="text-center text-xs">Trạng thái</TableHead>
                <TableHead className="text-center text-xs w-[140px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Chưa có giao dịch nâng cấp gói nào
                  </TableCell>
                </TableRow>
              ) : (
                items.map((order) => {
                  const statusConf = STATUS_BADGES[order.status] ?? STATUS_BADGES.pending;
                  const StatusIcon = statusConf.icon;

                  return (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors text-xs">
                      <TableCell className="font-mono text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground font-mono">
                          {order.id.slice(0, 8)}...
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Store: {order.storeId.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold capitalize text-primary">
                          Gói {order.planSlug}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Chu kỳ: {order.durationMonths} tháng
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-black font-mono text-sm text-foreground">
                        {formatCurrency(order.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            order.paymentMethod === "stripe"
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          }
                        >
                          {order.paymentMethod.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`gap-1 ${statusConf.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {order.status === "pending" && order.paymentMethod === "stripe" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 gap-1 text-primary hover:bg-primary/10 border-primary/30"
                              onClick={() => handleSyncOrder(order.id)}
                              disabled={syncingOrderId === order.id}
                              title="Kiểm tra thanh toán từ Stripe"
                            >
                              <RefreshCcw className={`h-2.5 w-2.5 ${syncingOrderId === order.id ? "animate-spin" : ""}`} />
                              <span>Đồng bộ</span>
                            </Button>
                          )}
                          {order.checkoutUrl ? (
                            <a
                              href={order.checkoutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-medium"
                              title="Mở cổng Stripe"
                            >
                              <span>Stripe</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
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
            <p className="text-xs text-muted-foreground">
              Hiển thị <span className="font-medium">{items.length}</span> /{" "}
              <span className="font-medium">{total}</span> giao dịch
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setParams((p) => ({ ...p, page: currentPage - 1 }))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setParams((p) => ({ ...p, page: currentPage + 1 }))}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
