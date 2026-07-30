import { DebtPayment } from '../entities/DebtPayment.js';

export interface DebtSummaryRow {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  currentDebt: number;
  totalPaid: number;
  totalDebtCreated: number;
  remainingDebt: number;
}

export interface IDebtPaymentRepository {
  findById(id: string): Promise<DebtPayment | null>;
  findByCustomerId(customerId: string): Promise<DebtPayment[]>;
  create(payment: DebtPayment): Promise<DebtPayment>;

  /** Get aggregated debt summary for all customers in a store (backed by vw_customer_debt_summary). */
  getDebtSummary(storeId: string): Promise<DebtSummaryRow[]>;

  /** Get debt summary for a single customer. */
  getCustomerDebtSummary(customerId: string): Promise<DebtSummaryRow | null>;
}
