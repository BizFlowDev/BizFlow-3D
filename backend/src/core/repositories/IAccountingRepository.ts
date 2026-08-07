import { AccountingEntry } from '../entities/AccountingEntry.js';

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
}