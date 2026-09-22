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

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Lấy báo cáo tài chính theo loại và khoảng thời gian.
 * API: GET /accounting/financial-report?reportType&fromDate&toDate
 * Dữ liệu thật từ database (accounting_entries + orders).
 */
export function useFinancialReport(
  reportType: ReportType,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: accountingKeys.financialReport(reportType, fromDate, toDate),
    queryFn: async (): Promise<FinancialReportOutput> => {
      const { data } = await apiClient.get<ApiResponseData<FinancialReportOutput>>(
        "/accounting/financial-report",
        { params: { reportType, fromDate, toDate } },
      );
      if (!data.data) {
        throw new Error(data.message || "Không có dữ liệu báo cáo");
      }
      return data.data;
    },
    staleTime: 60_000,
    retry: 1,
    enabled: Boolean(fromDate && toDate),
  });
}

