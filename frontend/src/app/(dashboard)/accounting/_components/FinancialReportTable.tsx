"use client";

import { motion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type {
  ReportType,
  FinancialReportOutput,
  RevenueLedgerReport,
  DebtReport,
  BusinessResultReport,
  TrialBalanceReport,
} from "@/hooks/useAccounting";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ── Animation variants ────────────────────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, duration: 0.3, ease: "easeOut" as const },
  }),
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface FinancialReportTableProps {
  reportType: ReportType;
  data: FinancialReportOutput | undefined;
  isLoading: boolean;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FinancialReportTable({
  reportType,
  data,
  isLoading,
}: FinancialReportTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Minus className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Chọn khoảng thời gian để xem báo cáo
        </p>
      </div>
    );
  }

  switch (reportType) {
    case "revenue_ledger":
      return <RevenueLedgerTable data={data as RevenueLedgerReport} />;
    case "debt_report":
      return <DebtReportTable data={data as DebtReport} />;
    case "business_result":
      return <BusinessResultTable data={data as BusinessResultReport} />;
    case "trial_balance":
      return <TrialBalanceTable data={data as TrialBalanceReport} />;
    default:
      return null;
  }
}

// ── a. Sổ cái doanh thu chi tiết ─────────────────────────────────────────────

function RevenueLedgerTable({ data }: { data: RevenueLedgerReport }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[70px] text-center">STT</TableHead>
            <TableHead className="min-w-[140px]">Ngày</TableHead>
            <TableHead className="text-center min-w-[120px]">Số đơn hàng</TableHead>
            <TableHead className="text-right min-w-[180px]">Doanh thu</TableHead>
            <TableHead className="min-w-[120px]">Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, index) => (
            <motion.tr
              key={row.date}
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={index}
              className="group border-b transition-colors hover:bg-muted/40"
            >
              <TableCell className="text-center font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                >
                  {row.orderCount}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCurrency(row.totalRevenue)}
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
            </motion.tr>
          ))}

          {/* Tổng cộng */}
          <motion.tr
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={data.rows.length}
            className="border-t-2 border-border bg-gradient-to-r from-blue-50/80 to-cyan-50/80 dark:from-blue-950/20 dark:to-cyan-950/20 font-bold"
          >
            <TableCell colSpan={2} className="text-right font-bold text-base">
              TỔNG CỘNG
            </TableCell>
            <TableCell className="text-center">
              <Badge className="bg-blue-600 text-white text-sm">
                {data.totalOrders}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
              {formatCurrency(data.totalRevenue)}
            </TableCell>
            <TableCell />
          </motion.tr>
        </TableBody>
      </Table>
    </div>
  );
}

// ── b. Báo cáo nợ chưa thanh toán ────────────────────────────────────────────

function DebtReportTable({ data }: { data: DebtReport }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[70px] text-center">STT</TableHead>
            <TableHead className="min-w-[180px]">Khách hàng</TableHead>
            <TableHead className="min-w-[130px]">SĐT</TableHead>
            <TableHead className="text-right min-w-[140px]">Nợ đầu kỳ</TableHead>
            <TableHead className="text-right min-w-[140px]">Phát sinh</TableHead>
            <TableHead className="text-right min-w-[140px]">Đã thu</TableHead>
            <TableHead className="text-right min-w-[140px]">Nợ cuối kỳ</TableHead>
            <TableHead className="text-center min-w-[100px]">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, index) => (
            <motion.tr
              key={row.customerId}
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={index}
              className="group border-b transition-colors hover:bg-muted/40"
            >
              <TableCell className="text-center font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{row.customerName}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.customerPhone ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(row.openingDebt)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.accrued > 0 ? (
                  <span className="text-red-600 dark:text-red-400">
                    +{formatCurrency(row.accrued)}
                  </span>
                ) : (
                  formatCurrency(0)
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.collected > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    -{formatCurrency(row.collected)}
                  </span>
                ) : (
                  formatCurrency(0)
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {row.closingDebt > 0 ? (
                  <span className="text-red-600 dark:text-red-400">
                    {formatCurrency(row.closingDebt)}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(0)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {row.isOverdue ? (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Còn nợ
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  >
                    Đã thanh toán
                  </Badge>
                )}
              </TableCell>
            </motion.tr>
          ))}

          {/* Tổng cộng */}
          <motion.tr
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={data.rows.length}
            className="border-t-2 border-border bg-gradient-to-r from-red-50/80 to-amber-50/80 dark:from-red-950/20 dark:to-amber-950/20 font-bold"
          >
            <TableCell colSpan={3} className="text-right font-bold text-base">
              TỔNG CỘNG
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold">
              {formatCurrency(data.totalOpeningDebt)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-red-600 dark:text-red-400">
              +{formatCurrency(data.totalAccrued)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
              -{formatCurrency(data.totalCollected)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold text-base text-red-700 dark:text-red-400">
              {formatCurrency(data.totalClosingDebt)}
            </TableCell>
            <TableCell />
          </motion.tr>

          {/* Nợ quá hạn */}
          {data.overdueDebt > 0 && (
            <motion.tr
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={data.rows.length + 1}
              className="bg-red-50/50 dark:bg-red-950/10"
            >
              <TableCell colSpan={6} className="text-right font-semibold text-red-700 dark:text-red-400">
                Trong đó nợ quá hạn:
              </TableCell>
              <TableCell className="text-right tabular-nums font-bold text-red-700 dark:text-red-400">
                {formatCurrency(data.overdueDebt)}
              </TableCell>
              <TableCell />
            </motion.tr>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ── c. Kết quả hoạt động kinh doanh ──────────────────────────────────────────

interface BusinessRow {
  stt: number;
  indicator: string;
  code: string;
  amount: number;
  isHighlight: boolean;
  isPositive: boolean;
}

function BusinessResultTable({ data }: { data: BusinessResultReport }) {
  const rows: BusinessRow[] = [
    { stt: 1, indicator: "Doanh thu bán hàng và cung cấp dịch vụ", code: "01", amount: data.totalRevenue, isHighlight: false, isPositive: true },
    { stt: 2, indicator: "Giá vốn hàng bán", code: "11", amount: data.costOfGoods, isHighlight: false, isPositive: false },
    { stt: 3, indicator: "Lợi nhuận gộp (01 - 11)", code: "20", amount: data.grossProfit, isHighlight: true, isPositive: data.grossProfit >= 0 },
    { stt: 4, indicator: "Chi phí bán hàng", code: "24", amount: data.rows.find((r) => r.accountCode === "641")?.debit ?? 0, isHighlight: false, isPositive: false },
    { stt: 5, indicator: "Chi phí quản lý doanh nghiệp", code: "25", amount: data.rows.find((r) => r.accountCode === "642")?.debit ?? 0, isHighlight: false, isPositive: false },
    { stt: 6, indicator: "Tổng chi phí hoạt động", code: "30", amount: data.operatingExpenses, isHighlight: false, isPositive: false },
    { stt: 7, indicator: "Lợi nhuận thuần từ hoạt động kinh doanh", code: "50", amount: data.netProfit, isHighlight: true, isPositive: data.netProfit >= 0 },
  ];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[70px] text-center">STT</TableHead>
            <TableHead className="min-w-[320px]">Chỉ tiêu</TableHead>
            <TableHead className="text-center w-[100px]">Mã số</TableHead>
            <TableHead className="text-right min-w-[200px]">Số tiền</TableHead>
            <TableHead className="min-w-[120px]">Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <motion.tr
              key={row.code}
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={index}
              className={`group border-b transition-colors hover:bg-muted/40 ${
                row.isHighlight
                  ? "bg-gradient-to-r from-blue-50/60 to-indigo-50/60 dark:from-blue-950/15 dark:to-indigo-950/15"
                  : ""
              }`}
            >
              <TableCell className="text-center font-medium text-muted-foreground">
                {row.stt}
              </TableCell>
              <TableCell className={`${row.isHighlight ? "font-bold text-foreground" : "font-medium"}`}>
                {row.indicator}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="secondary"
                  className={
                    row.isHighlight
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 font-bold"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {row.code}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span
                  className={`font-semibold ${
                    row.isHighlight
                      ? row.isPositive
                        ? "text-emerald-700 dark:text-emerald-400 text-base"
                        : "text-red-700 dark:text-red-400 text-base"
                      : ""
                  }`}
                >
                  {row.isHighlight && (
                    row.isPositive
                      ? <TrendingUp className="inline h-4 w-4 mr-1.5 text-emerald-600" />
                      : <TrendingDown className="inline h-4 w-4 mr-1.5 text-red-600" />
                  )}
                  {formatCurrency(row.amount)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.isHighlight ? (row.isPositive ? "Lãi" : "Lỗ") : "—"}
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── d. Bảng cân đối phát sinh ─────────────────────────────────────────────────

function TrialBalanceTable({ data }: { data: TrialBalanceReport }) {
  const totals = data.rows.reduce(
    (acc, r) => ({
      openingDebit: acc.openingDebit + r.openingDebit,
      openingCredit: acc.openingCredit + r.openingCredit,
      debit: acc.debit + r.debit,
      credit: acc.credit + r.credit,
      closingDebit: acc.closingDebit + r.closingDebit,
      closingCredit: acc.closingCredit + r.closingCredit,
    }),
    { openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
  );

  const accountTypeLabels: Record<string, string> = {
    asset: "Tài sản",
    liability: "Nợ phải trả",
    equity: "Vốn chủ SH",
    expense: "Chi phí",
    revenue: "Doanh thu",
  };

  const accountTypeColors: Record<string, string> = {
    asset: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    liability: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    equity: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
    expense: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    revenue: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-[70px] text-center" rowSpan={2}>STT</TableHead>
            <TableHead className="min-w-[200px]" rowSpan={2}>Tài khoản</TableHead>
            <TableHead className="text-center w-[90px]" rowSpan={2}>Mã TK</TableHead>
            <TableHead className="text-center w-[100px]" rowSpan={2}>Loại</TableHead>
            <TableHead className="text-center border-l" colSpan={2}>Số dư đầu kỳ</TableHead>
            <TableHead className="text-center border-l" colSpan={2}>Phát sinh trong kỳ</TableHead>
            <TableHead className="text-center border-l" colSpan={2}>Số dư cuối kỳ</TableHead>
          </TableRow>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="text-right min-w-[120px] border-l">Nợ</TableHead>
            <TableHead className="text-right min-w-[120px]">Có</TableHead>
            <TableHead className="text-right min-w-[120px] border-l">Nợ</TableHead>
            <TableHead className="text-right min-w-[120px]">Có</TableHead>
            <TableHead className="text-right min-w-[120px] border-l">Nợ</TableHead>
            <TableHead className="text-right min-w-[120px]">Có</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.map((row, index) => (
            <motion.tr
              key={row.accountCode}
              variants={rowVariants}
              initial="hidden"
              animate="show"
              custom={index}
              className="group border-b transition-colors hover:bg-muted/40"
            >
              <TableCell className="text-center font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium">{row.accountName}</TableCell>
              <TableCell className="text-center font-mono text-sm font-semibold">
                {row.accountCode}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="secondary"
                  className={`text-xs ${accountTypeColors[row.accountType] ?? ""}`}
                >
                  {accountTypeLabels[row.accountType] ?? row.accountType}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums border-l">
                {row.openingDebit > 0 ? formatCurrency(row.openingDebit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.openingCredit > 0 ? formatCurrency(row.openingCredit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums border-l">
                {row.debit > 0 ? formatCurrency(row.debit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.credit > 0 ? formatCurrency(row.credit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold border-l">
                {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : "—"}
              </TableCell>
            </motion.tr>
          ))}

          {/* Tổng cộng */}
          <motion.tr
            variants={rowVariants}
            initial="hidden"
            animate="show"
            custom={data.rows.length}
            className="border-t-2 border-border bg-gradient-to-r from-violet-50/80 to-blue-50/80 dark:from-violet-950/20 dark:to-blue-950/20 font-bold"
          >
            <TableCell colSpan={4} className="text-right font-bold text-base">
              TỔNG CỘNG
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold border-l">
              {formatCurrency(totals.openingDebit)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold">
              {formatCurrency(totals.openingCredit)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold border-l">
              {formatCurrency(totals.debit)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold">
              {formatCurrency(totals.credit)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold border-l">
              {formatCurrency(totals.closingDebit)}
            </TableCell>
            <TableCell className="text-right tabular-nums font-bold">
              {formatCurrency(totals.closingCredit)}
            </TableCell>
          </motion.tr>
        </TableBody>
      </Table>
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-[50px]" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-6 w-[120px]" />
          <Skeleton className="h-6 w-[100px]" />
        </div>
      ))}
    </div>
  );
}
