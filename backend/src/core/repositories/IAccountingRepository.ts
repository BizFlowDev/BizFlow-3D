import { AccountingEntry } from '../entities/AccountingEntry.js';
import type { DailyRevenueRow } from './IOrderRepository.js';

export interface ReportWarning {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  count: number;
}
export interface AccountingPosting {
  entries: AccountingEntry[];
  costStatus: 'complete' | 'estimated' | 'missing';
  missingProductIds: string[];
}

/** Dòng trên bảng cân đối phát sinh (theo tài khoản). */
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: 'asset' | 'liability' | 'equity' | 'expense' | 'revenue';
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
}

/** Doanh thu / chi phí / lợi nhuận theo tài khoản. */
export interface BusinessResultRow {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

/** Biến động nợ theo khách hàng trong kỳ. */
export interface DebtMovementRow {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  openingDebt: number;
  accrued: number;
  collected: number;
  closingDebt: number;
}

export interface IAccountingRepository {
  postBalanced(posting: AccountingPosting): Promise<void>;
  getReportWarnings(storeId: string, fromDate: Date, toDate: Date): Promise<ReportWarning[]>;
  getRevenueLedger(storeId: string, fromDate: Date, toDate: Date): Promise<DailyRevenueRow[]>;
  /** Tạo đồng loạt nhiều bút toán (một nghiệp vụ = nhiều dòng). */
  createMany(entries: AccountingEntry[]): Promise<AccountingEntry[]>;

  /** Tìm bút toán theo nghiệp vụ gốc (tránh hạch toán trùng). */
  findByReference(
    referenceType: 'order' | 'inventory_import' | 'debt_payment',
    referenceId: string,
  ): Promise<AccountingEntry[]>;

  /** Các bút toán của cửa hàng trong khoảng thời gian. */
  findByStoreAndPeriod(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AccountingEntry[]>;

  /** Bảng cân đối phát sinh: gộp theo tài khoản, kèm số dư đầu kỳ/cuối kỳ. */
  getTrialBalance(storeId: string, fromDate: Date, toDate: Date): Promise<TrialBalanceRow[]>;

  /** Doanh thu & chi phí gộp theo tài khoản (dùng cho kết quả kinh doanh). */
  getBusinessResult(storeId: string, fromDate: Date, toDate: Date): Promise<BusinessResultRow[]>;

  /** Biến động công nợ theo khách hàng trong kỳ. */
  getDebtMovement(storeId: string, fromDate: Date, toDate: Date): Promise<DebtMovementRow[]>;

  /** Đơn giá vốn bình quân gia quyền (theo base unit) cho danh sách sản phẩm. */
  getProductAverageCosts(storeId: string, productIds: string[], asOf: Date): Promise<Map<string, number>>;

  /** Hệ số quy đổi đơn vị (conversion_factor) cho danh sách đơn vị quy đổi. */
  getUnitConversionFactors(unitIds: string[]): Promise<Map<string, number>>;
}
