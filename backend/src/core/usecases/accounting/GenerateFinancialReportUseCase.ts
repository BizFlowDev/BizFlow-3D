import { IOrderRepository, DailyRevenueRow } from '../../repositories/IOrderRepository.js';
import { IAccountingRepository, TrialBalanceRow, DebtMovementRow, BusinessResultRow } from '../../repositories/IAccountingRepository.js';
import { ValidationError } from '../../errors/ValidationError.js';

export type ReportType = 'revenue_ledger' | 'debt_report' | 'business_result' | 'trial_balance';

/** Khung chung cho mọi báo cáo theo Thông tư 88/2021/TT-BTC. */
interface ReportBase {
  type: ReportType;
  storeId: string;
  period: { from: Date; to: Date };
  generatedAt: Date;
}

export interface RevenueLedgerReport extends ReportBase {
  type: 'revenue_ledger';
  rows: DailyRevenueRow[];
  totalRevenue: number;
  totalOrders: number;
}

export interface DebtReportRow extends DebtMovementRow {
  isOverdue: boolean;
}

export interface DebtReport extends ReportBase {
  type: 'debt_report';
  rows: DebtReportRow[];
  totalOpeningDebt: number;
  totalAccrued: number;
  totalCollected: number;
  totalClosingDebt: number;
  overdueDebt: number;
}

export interface BusinessResultReport extends ReportBase {
  type: 'business_result';
  rows: BusinessResultRow[];
  totalRevenue: number;
  costOfGoods: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
}

export interface TrialBalanceReport extends ReportBase {
  type: 'trial_balance';
  rows: TrialBalanceRow[];
}

export type FinancialReportOutput =
  | RevenueLedgerReport
  | DebtReport
  | BusinessResultReport
  | TrialBalanceReport;

/**
 * GenerateFinancialReportUseCase
 *
 * Sinh báo cáo tài chính theo mẫu Thông tư 88/2021/TT-BTC (rút gọn cho hộ kinh doanh).
 * Dữ liệu lấy từ bảng accounting_entries (sổ cái hạch toán) + các view nghiệp vụ.
 * Kết quả luôn ở dạng bảng text/JSON để hiển thị an toàn, KHÔNG phụ thuộc 3D.
 */
export class GenerateFinancialReportUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly accountingRepo: IAccountingRepository,
  ) { }

  async execute(
    storeId: string,
    reportType: ReportType,
    fromDate: Date,
    toDate: Date,
  ): Promise<FinancialReportOutput> {
    if (fromDate > toDate) {
      throw new ValidationError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc');
    }
    const base: ReportBase = {
      type: reportType,
      storeId,
      period: { from: fromDate, to: toDate },
      generatedAt: new Date(),
    };

    switch (reportType) {
      case 'revenue_ledger':
        return this.buildRevenueLedger(base, fromDate, toDate);
      case 'debt_report':
        return this.buildDebtReport(base, fromDate, toDate);
      case 'business_result':
        return this.buildBusinessResult(base, fromDate, toDate);
      case 'trial_balance':
        return this.buildTrialBalance(base, fromDate, toDate);
      default:
        throw new ValidationError(`Loại báo cáo không hợp lệ: ${String(reportType)}`);
    }
  }

  // ── a. Sổ cái doanh thu chi tiết ─────────────────────────────────────────
  private async buildRevenueLedger(
    base: ReportBase,
    fromDate: Date,
    toDate: Date,
  ): Promise<RevenueLedgerReport> {
    const rows = await this.orderRepo.getDailyRevenue(base.storeId, fromDate, toDate);
    const totalRevenue = rows.reduce((sum, r) => sum + r.totalRevenue, 0);
    const totalOrders = rows.reduce((sum, r) => sum + r.orderCount, 0);
    return {
      ...base, type: 'revenue_ledger',
      rows, totalRevenue, totalOrders,
    };
  }

  // ── b. Báo cáo nợ chưa thanh toán ────────────────────────────────────────
  private async buildDebtReport(
    base: ReportBase,
    fromDate: Date,
    toDate: Date,
  ): Promise<DebtReport> {
    const movement = await this.accountingRepo.getDebtMovement(base.storeId, fromDate, toDate);
    const rows: DebtReportRow[] = movement.map((m) => ({
      ...m,
      isOverdue: m.closingDebt > 0,
    }));

    const totalOpeningDebt = rows.reduce((s, r) => s + r.openingDebt, 0);
    const totalAccrued = rows.reduce((s, r) => s + r.accrued, 0);
    const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
    const totalClosingDebt = rows.reduce((s, r) => s + r.closingDebt, 0);
    const overdueDebt = rows.filter((r) => r.isOverdue).reduce((s, r) => s + r.closingDebt, 0);

    return {
      ...base, type: 'debt_report',
      rows,
      totalOpeningDebt,
      totalAccrued,
      totalCollected,
      totalClosingDebt,
      overdueDebt,
    };
  }

  // ── c. Kết quả hoạt động kinh doanh ──────────────────────────────────────
  private async buildBusinessResult(
    base: ReportBase,
    fromDate: Date,
    toDate: Date,
  ): Promise<BusinessResultReport> {
    const rows = await this.accountingRepo.getBusinessResult(base.storeId, fromDate, toDate);

    const row511 = rows.find((r) => r.accountCode === '511');
    const row632 = rows.find((r) => r.accountCode === '632');

    const totalRevenue = row511 ? row511.credit : 0;
    const costOfGoods = row632 ? row632.debit : 0;
    const operatingExpenses = rows
      .filter((r) => ['641', '642'].includes(r.accountCode))
      .reduce((s, r) => s + r.debit, 0);

    const grossProfit = totalRevenue - costOfGoods;
    const netProfit = grossProfit - operatingExpenses;

    return {
      ...base, type: 'business_result',
      rows,
      totalRevenue,
      costOfGoods,
      operatingExpenses,
      grossProfit,
      netProfit,
    };
  }

  // ── d. Bảng cân đối phát sinh ────────────────────────────────────────────
  private async buildTrialBalance(
    base: ReportBase,
    fromDate: Date,
    toDate: Date,
  ): Promise<TrialBalanceReport> {
    const rows = await this.accountingRepo.getTrialBalance(base.storeId, fromDate, toDate);
    return { ...base, type: 'trial_balance', rows };
  }
}