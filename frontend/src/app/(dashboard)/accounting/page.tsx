"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  CalendarDays,
  RefreshCcw,
  AlertTriangle,
  TrendingUp,
  Scale,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import ExportButton, {
  type ExportSection,
} from "@/components/shared/ExportButton";
import FinancialReportTable from "./_components/FinancialReportTable";
import ReportTemplateSelector from "./_components/ReportTemplateSelector";
import {
  useFinancialReport,
  type ReportType,
  type FinancialReportOutput,
  type RevenueLedgerReport,
  type DebtReport,
  type BusinessResultReport,
  type TrialBalanceReport,
} from "@/hooks/useAccounting";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateVN(dateStr: string): string {
  if (!dateStr) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ── Tab config ────────────────────────────────────────────────────────────────

interface TabConfig {
  value: ReportType;
  label: string;
  shortLabel: string;
  icon: typeof BookOpen;
  description: string;
}

const TABS: TabConfig[] = [
  {
    value: "revenue_ledger",
    label: "Sổ cái doanh thu",
    shortLabel: "Doanh thu",
    icon: BookOpen,
    description: "Chi tiết doanh thu theo ngày trong kỳ",
  },
  {
    value: "debt_report",
    label: "Nợ chưa thanh toán",
    shortLabel: "Công nợ",
    icon: AlertTriangle,
    description: "Tổng hợp nợ phải thu theo khách hàng",
  },
  {
    value: "business_result",
    label: "Kết quả kinh doanh",
    shortLabel: "KQKD",
    icon: TrendingUp,
    description: "Báo cáo lãi/lỗ hoạt động kinh doanh",
  },
  {
    value: "trial_balance",
    label: "Cân đối phát sinh",
    shortLabel: "CĐPS",
    icon: Scale,
    description: "Bảng cân đối tài khoản theo kỳ",
  },
];

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

// ── Export helpers ─────────────────────────────────────────────────────────────

function buildExportSections(
  data: FinancialReportOutput | undefined,
  reportType: ReportType,
): ExportSection[] {
  if (!data) return [];

  switch (reportType) {
    case "revenue_ledger": {
      const d = data as RevenueLedgerReport;
      return [
        {
          title: "Sổ cái doanh thu chi tiết",
          columns: ["STT", "Ngày", "Số đơn hàng", "Doanh thu (VND)", "Ghi chú"],
          rows: [
            ...d.rows.map((r, i) => [
              i + 1,
              r.date,
              r.orderCount,
              r.totalRevenue,
              "",
            ]),
            ["", "TỔNG CỘNG", d.totalOrders, d.totalRevenue, ""],
          ],
        },
      ];
    }
    case "debt_report": {
      const d = data as DebtReport;
      return [
        {
          title: "Báo cáo nợ chưa thanh toán",
          columns: [
            "STT",
            "Khách hàng",
            "SĐT",
            "Nợ đầu kỳ",
            "Phát sinh",
            "Đã thu",
            "Nợ cuối kỳ",
            "Trạng thái",
          ],
          rows: [
            ...d.rows.map((r, i) => [
              i + 1,
              r.customerName,
              r.customerPhone ?? "",
              r.openingDebt,
              r.accrued,
              r.collected,
              r.closingDebt,
              r.isOverdue ? "Còn nợ" : "Đã TT",
            ]),
            [
              "",
              "TỔNG CỘNG",
              "",
              d.totalOpeningDebt,
              d.totalAccrued,
              d.totalCollected,
              d.totalClosingDebt,
              "",
            ],
          ],
        },
      ];
    }
    case "business_result": {
      const d = data as BusinessResultReport;
      return [
        {
          title: "Báo cáo kết quả hoạt động kinh doanh",
          columns: ["STT", "Chỉ tiêu", "Mã số", "Số tiền (VND)", "Ghi chú"],
          rows: [
            [1, "Doanh thu bán hàng và cung cấp dịch vụ", "01", d.totalRevenue, ""],
            [2, "Giá vốn hàng bán", "11", d.costOfGoods, ""],
            [3, "Lợi nhuận gộp", "20", d.grossProfit, d.grossProfit >= 0 ? "Lãi" : "Lỗ"],
            [
              4,
              "Chi phí bán hàng",
              "24",
              d.rows.find((r) => r.accountCode === "641")?.debit ?? 0,
              "",
            ],
            [
              5,
              "Chi phí quản lý doanh nghiệp",
              "25",
              d.rows.find((r) => r.accountCode === "642")?.debit ?? 0,
              "",
            ],
            [6, "Tổng chi phí hoạt động", "30", d.operatingExpenses, ""],
            [
              7,
              "Lợi nhuận thuần từ HĐKD",
              "50",
              d.netProfit,
              d.netProfit >= 0 ? "Lãi" : "Lỗ",
            ],
          ],
        },
      ];
    }
    case "trial_balance": {
      const d = data as TrialBalanceReport;
      return [
        {
          title: "Bảng cân đối phát sinh",
          columns: [
            "STT",
            "Tài khoản",
            "Mã TK",
            "Loại",
            "Nợ đầu kỳ",
            "Có đầu kỳ",
            "Nợ phát sinh",
            "Có phát sinh",
            "Nợ cuối kỳ",
            "Có cuối kỳ",
          ],
          rows: d.rows.map((r, i) => [
            i + 1,
            r.accountName,
            r.accountCode,
            r.accountType,
            r.openingDebit,
            r.openingCredit,
            r.debit,
            r.credit,
            r.closingDebit,
            r.closingCredit,
          ]),
        },
      ];
    }
    default:
      return [];
  }
}

// ── Page Component ────────────────────────────────────────────────────────────

export default function AccountingPage() {
  // ── State ──
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReportType>("revenue_ledger");
  const [fromDate, setFromDate] = useState(() =>
    toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [toDate, setToDate] = useState(() => toISODate(now));

  // ── Query ──
  const { data, isLoading, refetch, isFetching } = useFinancialReport(
    activeTab,
    fromDate,
    toDate,
  );

  // ── Export sections ──
  const exportSections = useMemo(
    () => buildExportSections(data, activeTab),
    [data, activeTab],
  );

  const activeTabConfig = TABS.find((t) => t.value === activeTab);
  const periodLabel = `${formatDateVN(fromDate)} → ${formatDateVN(toDate)}`;

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
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 shadow-lg shadow-blue-500/25">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Kế toán
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Báo cáo tài chính theo Thông tư 88/2021/TT-BTC ·{" "}
                <span className="font-medium">{periodLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Tools ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ReportTemplateSelector
            value={activeTab}
            onValueChange={(v) => setActiveTab(v)}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Tải lại"
              id="accounting-refresh-btn"
            >
              <RefreshCcw
                className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
            </Button>
            <ExportButton
              title={`${activeTabConfig?.label ?? "Báo cáo"} — BizFlow 3D`}
              subtitle={`Kỳ báo cáo: ${periodLabel}`}
              filename={`ke-toan-${activeTab}-${fromDate}-${toDate}`}
              sections={exportSections}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Date Range Selector ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Kỳ báo cáo:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Từ ngày"
            className="w-[160px]"
            id="accounting-from-date"
          />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <Input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="Đến ngày"
            className="w-[160px]"
            id="accounting-to-date"
          />
        </div>

        {/* Quick range buttons */}
        <div className="flex flex-wrap gap-1.5">
          {[
            {
              label: "Tháng này", fn: () => {
                const n = new Date();
                setFromDate(toISODate(new Date(n.getFullYear(), n.getMonth(), 1)));
                setToDate(toISODate(n));
              }
            },
            {
              label: "Quý này", fn: () => {
                const n = new Date();
                const q = Math.floor(n.getMonth() / 3) * 3;
                setFromDate(toISODate(new Date(n.getFullYear(), q, 1)));
                setToDate(toISODate(n));
              }
            },
            {
              label: "Năm nay", fn: () => {
                const n = new Date();
                setFromDate(toISODate(new Date(n.getFullYear(), 0, 1)));
                setToDate(toISODate(n));
              }
            },
          ].map((opt) => (
            <Button
              key={opt.label}
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={opt.fn}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ReportType)}
          className="w-full"
        >
          <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 h-auto flex-wrap">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2"
                id={`tab-${tab.value}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Tab Content ── */}
          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              <Card className="border-border/50 bg-card/50 shadow-sm backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/40">
                        <tab.icon className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tab.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {tab.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {data && !isLoading && (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        >
                          <FileText className="h-3 w-3" />
                          {periodLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {activeTab === tab.value && (
                    <FinancialReportTable
                      reportType={tab.value}
                      data={data}
                      isLoading={isLoading}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>

      {/* ── Report Info Footer ── */}
      <motion.div
        variants={itemVariants}
        className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Báo cáo tài chính được lập theo mẫu rút gọn dành cho hộ kinh doanh
            (Thông tư 88/2021/TT-BTC). Số liệu được tính từ sổ cái hạch toán
            tự động.
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {data && (
              <>
                Tạo lúc:{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(data.generatedAt))}
              </>
            )}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
