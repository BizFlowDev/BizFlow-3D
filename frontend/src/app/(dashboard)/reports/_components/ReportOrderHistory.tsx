"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Receipt,
  ReceiptText,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  useOrderList,
  getOrderCode,
  type OrderStatus,
} from "@/hooks/useOrders";
import {
  formatCurrency,
  formatDateTime,
  type RevenueBucket,
} from "@/lib/report-utils";
import {
  statusBadge,
  paymentMethodBadge,
} from "@/app/(dashboard)/orders/_components/OrderDetailDialog";

interface ReportOrderHistoryProps {
  fromDate: string; // yyyy-MM-dd
  toDate: string; // yyyy-MM-dd
  rangeLabel: string;
  activeStation: RevenueBucket | null;
  onClearStation: () => void;
  onSelectOrder: (orderId: string) => void;
}

export default function ReportOrderHistory({
  fromDate,
  toDate,
  rangeLabel,
  activeStation,
  onClearStation,
  onSelectOrder,
}: ReportOrderHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Nếu đang click vào 1 trạm (ngày/kỳ cụ thể), lọc theo ngày của trạm đó
  const queryFrom = activeStation ? activeStation.startDate : fromDate;
  const queryTo = activeStation ? activeStation.endDate : toDate;

  const { data, isLoading, isFetching } = useOrderList({
    fromDate: queryFrom,
    toDate: queryTo,
    status: statusFilter,
    page: 1,
    limit: 200, // Lấy tập dữ liệu lớn trong kỳ để phân trang và tìm kiếm client-side nhanh
  });

  const allOrders = useMemo(() => data?.items ?? [], [data?.items]);

  // Lọc tìm kiếm client-side theo mã đơn, khách hàng, số điện thoại
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return allOrders;
    const term = searchTerm.toLowerCase().trim();
    return allOrders.filter((o) => {
      const code = getOrderCode(o).toLowerCase();
      const customer = (o.customerName ?? "").toLowerCase();
      const phone = (o.customerPhone ?? "").toLowerCase();
      return (
        code.includes(term) ||
        customer.includes(term) ||
        phone.includes(term)
      );
    });
  }, [allOrders, searchTerm]);

  // Phân trang
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredOrders.slice(start, start + limit);
  }, [filteredOrders, currentPage, limit]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalRev = filteredOrders.reduce((s, o) => s + o.finalAmount, 0);
    const totalDebt = filteredOrders.reduce((s, o) => s + (o.debtAmount || 0), 0);
    const confirmedCount = filteredOrders.filter(
      (o) => o.status === "confirmed",
    ).length;
    const draftCount = filteredOrders.filter((o) => o.status === "draft").length;
    return { totalRev, totalDebt, confirmedCount, draftCount };
  }, [filteredOrders]);

  return (
    <Card className="border-border/50 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-lg md:text-xl font-bold">
              Lịch sử đơn hàng trong kỳ
            </CardTitle>
          </div>
          <CardDescription className="mt-1">
            Danh sách chi tiết các đơn hàng phát sinh trong khoảng{" "}
            <span className="font-medium text-foreground">{rangeLabel}</span>
            {activeStation && (
              <span className="inline-flex items-center gap-1.5 ml-2">
                · Lọc theo mốc:{" "}
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 pl-2 pr-1 gap-1"
                >
                  {activeStation.label}
                  <button
                    onClick={onClearStation}
                    aria-label="Bỏ lọc theo mốc"
                    className="hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </span>
            )}
          </CardDescription>
        </div>

        {/* Thống kê nhanh */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1 border-muted bg-background/50 px-2.5 py-1">
            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
            Tổng đơn: <span className="font-semibold">{totalItems}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 border-muted bg-background/50 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Doanh thu:{" "}
            <span className="font-bold tabular-nums">
              {formatCurrency(stats.totalRev)}
            </span>
          </Badge>
          {stats.totalDebt > 0 && (
            <Badge variant="outline" className="gap-1 border-red-200 bg-red-50/50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 px-2.5 py-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Nợ:{" "}
              <span className="font-bold tabular-nums">
                {formatCurrency(stats.totalDebt)}
              </span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bộ lọc & Tìm kiếm */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã đơn, khách hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val as OrderStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                <SelectItem value="draft">Đơn nháp</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bảng đơn hàng */}
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/50">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-[130px]">Mã đơn</TableHead>
                <TableHead className="min-w-[150px]">Thời gian</TableHead>
                <TableHead className="min-w-[160px]">Khách hàng</TableHead>
                <TableHead className="min-w-[140px]">Sản phẩm</TableHead>
                <TableHead className="min-w-[130px]">Thanh toán</TableHead>
                <TableHead className="text-right min-w-[120px]">Tổng tiền</TableHead>
                <TableHead className="text-right min-w-[100px]">Nợ</TableHead>
                <TableHead className="text-center min-w-[120px]">Trạng thái</TableHead>
                <TableHead className="text-center min-w-[90px]">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-8 w-8 mx-auto rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-44 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="rounded-full bg-muted p-3">
                        <Receipt className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Không tìm thấy đơn hàng nào trong khoảng thời gian này
                      </p>
                      {(searchTerm || statusFilter !== "all" || activeStation) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            onClearStation();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Xóa bộ lọc
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => {
                  const badge = statusBadge(order.status);
                  const payBadge = paymentMethodBadge(order.paymentMethod);
                  const PayIcon = payBadge.icon;
                  const items = order.items ?? [];
                  const totalQty = items.reduce((s, it) => s + it.quantity, 0);
                  const sampleNames = items
                    .map((it) => it.productName ?? "SP")
                    .slice(0, 2)
                    .join(", ");
                  const moreCount = items.length > 2 ? ` +${items.length - 2}` : "";

                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                      onClick={() => onSelectOrder(order.id)}
                    >
                      {/* Mã đơn */}
                      <TableCell>
                        <span className="font-semibold text-foreground hover:underline">
                          {getOrderCode(order)}
                        </span>
                      </TableCell>

                      {/* Thời gian */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDateTime(order.createdAt)}</span>
                        </div>
                      </TableCell>

                      {/* Khách hàng */}
                      <TableCell>
                        <span className="font-medium">
                          {order.customerName || "Khách lẻ"}
                        </span>
                        {order.customerPhone && (
                          <p className="text-xs text-muted-foreground">
                            {order.customerPhone}
                          </p>
                        )}
                      </TableCell>

                      {/* Sản phẩm tóm tắt */}
                      <TableCell>
                        <div className="text-xs">
                          <span className="font-medium text-foreground">
                            {totalQty > 0 ? `${totalQty} món` : "—"}
                          </span>
                          {sampleNames && (
                            <p className="truncate max-w-[160px] text-muted-foreground" title={`${sampleNames}${moreCount}`}>
                              {sampleNames}{moreCount}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Phương thức thanh toán */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`gap-1 text-[11px] font-normal ${payBadge.className}`}
                        >
                          <PayIcon className="h-3 w-3" />
                          {payBadge.label}
                        </Badge>
                      </TableCell>

                      {/* Tổng tiền */}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(order.finalAmount)}
                      </TableCell>

                      {/* Nợ */}
                      <TableCell className="text-right">
                        {order.debtAmount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-semibold tabular-nums text-xs"
                          >
                            {formatCurrency(order.debtAmount)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Trạng thái */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={`text-[11px] font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>

                      {/* Nút xem chi tiết */}
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => onSelectOrder(order.id)}
                          title="Xem chi tiết đơn hàng"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Hiển thị{" "}
              <span className="font-medium text-foreground">
                {paginatedOrders.length}
              </span>{" "}
              / <span className="font-medium text-foreground">{totalItems}</span>{" "}
              đơn hàng (Trang {currentPage}/{totalPages})
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs"
                disabled={currentPage >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
