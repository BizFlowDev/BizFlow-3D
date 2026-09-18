"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";
import type { ApiResponseData } from "@/lib/api-client";

// ── Types (mapped from backend GenerateFinancialReportUseCase) ────────────────

export type ReportType =
  | "revenue_ledger"
  | "debt_report"
  | "business_result"
  | "trial_balance";

interface ReportBase {
  type: ReportType;
  storeId: string;
  period: { from: string; to: string };
  generatedAt: string;
}

// a. Sổ cái doanh thu chi tiết
export interface DailyRevenueRow {
  date: string;
  totalRevenue: number;
  orderCount: number;
}

export interface RevenueLedgerReport extends ReportBase {
  type: "revenue_ledger";
  rows: DailyRevenueRow[];
  totalRevenue: number;
  totalOrders: number;
}

// b. Báo cáo nợ chưa thanh toán
export interface DebtReportRow {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  openingDebt: number;
  accrued: number;
  collected: number;
  closingDebt: number;
  isOverdue: boolean;
}

export interface DebtReport extends ReportBase {
  type: "debt_report";
  rows: DebtReportRow[];
  totalOpeningDebt: number;
  totalAccrued: number;
  totalCollected: number;
  totalClosingDebt: number;
  overdueDebt: number;
}

// c. Kết quả hoạt động kinh doanh
export interface BusinessResultRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface BusinessResultReport extends ReportBase {
  type: "business_result";
  rows: BusinessResultRow[];
  totalRevenue: number;
  costOfGoods: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
}

// d. Bảng cân đối phát sinh
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: "asset" | "liability" | "equity" | "expense" | "revenue";
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceReport extends ReportBase {
  type: "trial_balance";
  rows: TrialBalanceRow[];
}

export type FinancialReportOutput =
  | RevenueLedgerReport
  | DebtReport
  | BusinessResultReport
  | TrialBalanceReport;

// ── Query keys ────────────────────────────────────────────────────────────────

export const accountingKeys = {
  all: ["accounting"] as const,
  financialReport: (reportType: ReportType, fromDate: string, toDate: string) =>
    ["accounting", "financial-report", reportType, fromDate, toDate] as const,
};

// ── Mock Data (fallback khi API chưa sẵn sàng) ───────────────────────────────

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockBase(type: ReportType, fromDate: string, toDate: string): ReportBase {
  return {
    type,
    storeId: "mock-store",
    period: { from: fromDate, to: toDate },
    generatedAt: new Date().toISOString(),
  };
}

function generateMockRevenueLedger(fromDate: string, toDate: string): RevenueLedgerReport {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const rows: DailyRevenueRow[] = [];
  const d = new Date(from);

  while (d <= to) {
    const revenue = Math.floor(Math.random() * 8000000) + 2000000;
    const orders = Math.floor(Math.random() * 15) + 3;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    rows.push({
      date: `${y}-${m}-${day}`,
      totalRevenue: revenue,
      orderCount: orders,
    });
    d.setDate(d.getDate() + 1);
  }

  return {
    ...mockBase("revenue_ledger", fromDate, toDate),
    type: "revenue_ledger",
    rows,
    totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    totalOrders: rows.reduce((s, r) => s + r.orderCount, 0),
  };
}

function generateMockDebtReport(fromDate: string, toDate: string): DebtReport {
  const rows: DebtReportRow[] = [
    { customerId: "c1", customerName: "Nguyễn Văn A", customerPhone: "0901234567", openingDebt: 5000000, accrued: 3700000, collected: 4000000, closingDebt: 4700000, isOverdue: true },
    { customerId: "c2", customerName: "Trần Thị B", customerPhone: "0912345678", openingDebt: 2000000, accrued: 1500000, collected: 3500000, closingDebt: 0, isOverdue: false },
    { customerId: "c3", customerName: "Lê Văn C", customerPhone: "0987654321", openingDebt: 0, accrued: 8200000, collected: 3000000, closingDebt: 5200000, isOverdue: true },
    { customerId: "c4", customerName: "Phạm Thị D", customerPhone: "0976543210", openingDebt: 3200000, accrued: 0, collected: 1200000, closingDebt: 2000000, isOverdue: true },
    { customerId: "c5", customerName: "Hoàng Văn E", customerPhone: "0965432109", openingDebt: 1500000, accrued: 4500000, collected: 6000000, closingDebt: 0, isOverdue: false },
  ];

  return {
    ...mockBase("debt_report", fromDate, toDate),
    type: "debt_report",
    rows,
    totalOpeningDebt: rows.reduce((s, r) => s + r.openingDebt, 0),
    totalAccrued: rows.reduce((s, r) => s + r.accrued, 0),
    totalCollected: rows.reduce((s, r) => s + r.collected, 0),
    totalClosingDebt: rows.reduce((s, r) => s + r.closingDebt, 0),
    overdueDebt: rows.filter((r) => r.isOverdue).reduce((s, r) => s + r.closingDebt, 0),
  };
}

function generateMockBusinessResult(fromDate: string, toDate: string): BusinessResultReport {
  const rows: BusinessResultRow[] = [
    { accountCode: "511", accountName: "Doanh thu bán hàng", debit: 0, credit: 128400000 },
    { accountCode: "632", accountName: "Giá vốn hàng bán", debit: 89880000, credit: 0 },
    { accountCode: "641", accountName: "Chi phí bán hàng", debit: 5200000, credit: 0 },
    { accountCode: "642", accountName: "Chi phí quản lý", debit: 8400000, credit: 0 },
  ];

  const totalRevenue = 128400000;
  const costOfGoods = 89880000;
  const operatingExpenses = 5200000 + 8400000;
  const grossProfit = totalRevenue - costOfGoods;
  const netProfit = grossProfit - operatingExpenses;

  return {
    ...mockBase("business_result", fromDate, toDate),
    type: "business_result",
    rows,
    totalRevenue,
    costOfGoods,
    operatingExpenses,
    grossProfit,
    netProfit,
  };
}

function generateMockTrialBalance(fromDate: string, toDate: string): TrialBalanceReport {
  const rows: TrialBalanceRow[] = [
    { accountCode: "111", accountName: "Tiền mặt", accountType: "asset", openingDebit: 50000000, openingCredit: 0, debit: 128400000, credit: 95080000, closingDebit: 83320000, closingCredit: 0 },
    { accountCode: "112", accountName: "Tiền gửi ngân hàng", accountType: "asset", openingDebit: 25000000, openingCredit: 0, debit: 6000000, credit: 0, closingDebit: 31000000, closingCredit: 0 },
    { accountCode: "131", accountName: "Phải thu khách hàng", accountType: "asset", openingDebit: 11700000, openingCredit: 0, debit: 17900000, credit: 17700000, closingDebit: 11900000, closingCredit: 0 },
    { accountCode: "152", accountName: "Nguyên liệu, vật liệu", accountType: "asset", openingDebit: 8000000, openingCredit: 0, debit: 0, credit: 0, closingDebit: 8000000, closingCredit: 0 },
    { accountCode: "156", accountName: "Hàng hóa", accountType: "asset", openingDebit: 45000000, openingCredit: 0, debit: 65000000, credit: 89880000, closingDebit: 20120000, closingCredit: 0 },
    { accountCode: "331", accountName: "Phải trả người bán", accountType: "liability", openingDebit: 0, openingCredit: 15000000, debit: 0, credit: 65000000, closingDebit: 0, closingCredit: 80000000 },
    { accountCode: "421", accountName: "Lợi nhuận chưa phân phối", accountType: "equity", openingDebit: 0, openingCredit: 124700000, debit: 0, credit: 24920000, closingDebit: 0, closingCredit: 149620000 },
    { accountCode: "511", accountName: "Doanh thu bán hàng", accountType: "revenue", openingDebit: 0, openingCredit: 0, debit: 0, credit: 128400000, closingDebit: 0, closingCredit: 128400000 },
    { accountCode: "632", accountName: "Giá vốn hàng bán", accountType: "expense", openingDebit: 0, openingCredit: 0, debit: 89880000, credit: 0, closingDebit: 89880000, closingCredit: 0 },
    { accountCode: "911", accountName: "Xác định kết quả kinh doanh", accountType: "equity", openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
  ];

  return {
    ...mockBase("trial_balance", fromDate, toDate),
    type: "trial_balance",
    rows,
  };
}

function generateMockReport(
  reportType: ReportType,
  fromDate: string,
  toDate: string,
): FinancialReportOutput {
  switch (reportType) {
    case "revenue_ledger":
      return generateMockRevenueLedger(fromDate, toDate);
    case "debt_report":
      return generateMockDebtReport(fromDate, toDate);
    case "business_result":
      return generateMockBusinessResult(fromDate, toDate);
    case "trial_balance":
      return generateMockTrialBalance(fromDate, toDate);
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Lấy báo cáo tài chính theo loại và khoảng thời gian.
 * API: GET /accounting/financial-report?reportType&fromDate&toDate
 * Fallback: mock data khi API chưa sẵn sàng.
 */
export function useFinancialReport(
  reportType: ReportType,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: accountingKeys.financialReport(reportType, fromDate, toDate),
    queryFn: async (): Promise<FinancialReportOutput> => {
      try {
        const { data } = await apiClient.get<ApiResponseData<FinancialReportOutput>>(
          "/accounting/financial-report",
          { params: { reportType, fromDate, toDate } },
        );
        if (data.data) return data.data;
      } catch {
        // fallback mock
      }
      await delay(400);
      return generateMockReport(reportType, fromDate, toDate);
    },
    staleTime: 60_000,
    enabled: Boolean(fromDate && toDate),
  });
}
