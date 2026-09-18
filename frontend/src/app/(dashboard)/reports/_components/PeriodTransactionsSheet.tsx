"use client";

import { Eye, Receipt } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePeriodTransactions } from "@/hooks/useReports";
import {
  formatCurrency,
  formatDateTime,
  fmtFullDate,
  type RevenueBucket,
} from "@/lib/report-utils";
import { cn } from "@/lib/utils";

interface PeriodTransactionsSheetProps {
  /** Trạm đang được chọn (null = đóng) */
  station: RevenueBucket | null;
  onClose: () => void;
  onSelectOrder?: (orderId: string) => void;
}

/**
 * Sheet chi tiết giao dịch của một ngày/kỳ — mở khi click 1 cột trên
 * Dòng thời gian 3D hoặc biểu đồ 2D. Lấy danh sách đơn hàng đã xác nhận trong khoảng
 * ngày của trạm đó (GET /orders?fromDate&toDate&status=confirmed).
 */
export default function PeriodTransactionsSheet({
  station,
  onClose,
  onSelectOrder,
}: PeriodTransactionsSheetProps) {
  const open = Boolean(station);
  const { data, isLoading } = usePeriodTransactions(
    station?.startDate ?? "",
    station?.endDate ?? "",
  );

  const transactions = data ?? [];
  const totalRevenue = transactions.reduce((s, t) => s + t.finalAmount, 0);
  const totalDebt = transactions.reduce((s, t) => s + t.debtAmount, 0);

  const isSingleDay =
    station && station.startDate === station.endDate;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-xl overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Chi tiết giao dịch
          </SheetTitle>
          <SheetDescription>
            {station
              ? `${station.label}${
                  isSingleDay
                    ? ` · ${fmtFullDate(station.startDate)}`
                    : ` · ${fmtFullDate(station.startDate)} → ${fmtFullDate(station.endDate)}`
                }`
              : ""}
          </SheetDescription>
        </SheetHeader>

        {/* Tóm tắt kỳ */}
        {station && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SummaryChip
              label="Doanh thu"
              value={formatCurrency(totalRevenue)}
              tone="emerald"
            />
            <SummaryChip
              label="Số đơn"
              value={String(transactions.length)}
              tone="blue"
            />
            <SummaryChip
              label="Nợ"
              value={formatCurrency(totalDebt)}
              tone={totalDebt > 0 ? "red" : "zinc"}
            />
          </div>
        )}

        <div className="mt-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20 flex-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <div className="rounded-full bg-muted p-4">
                <Receipt className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Không có giao dịch trong kỳ này
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="min-w-[140px]">Đơn hàng</TableHead>
                    <TableHead className="min-w-[120px]">Khách hàng</TableHead>
                    <TableHead className="text-center min-w-[60px]">SL mặt hàng</TableHead>
                    <TableHead className="text-right min-w-[110px]">Tổng tiền</TableHead>
                    <TableHead className="text-right min-w-[90px]">Nợ</TableHead>
                    {onSelectOrder && (
                      <TableHead className="text-center min-w-[60px]">Chi tiết</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow
                      key={t.id}
                      className={cn(
                        "hover:bg-muted/40 transition-colors",
                        onSelectOrder && "cursor-pointer",
                      )}
                      onClick={() => onSelectOrder?.(t.id)}
                    >
                      <TableCell>
                        <span className="font-medium text-foreground hover:underline">
                          {t.orderCode}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(t.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.customerName}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {t.itemCount}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(t.finalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.debtAmount > 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400"
                          >
                            {formatCurrency(t.debtAmount)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {onSelectOrder && (
                        <TableCell className="text-center" onClick={(e) => { e.stopPropagation(); onSelectOrder(t.id); }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                            title="Xem chi tiết đơn hàng"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "blue" | "red" | "zinc";
}) {
  const tones = {
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    red: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    zinc: "bg-muted text-muted-foreground",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
      <p className="text-[11px] opacity-80">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
