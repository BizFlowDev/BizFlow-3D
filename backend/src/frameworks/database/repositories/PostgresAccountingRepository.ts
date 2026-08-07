import { AccountingEntry } from '../../../core/entities/AccountingEntry.js';
import {
  IAccountingRepository,
  TrialBalanceRow,
  BusinessResultRow,
  DebtMovementRow,
} from '../../../core/repositories/IAccountingRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresAccountingRepository implements IAccountingRepository {
  async createMany(entries: AccountingEntry[]): Promise<AccountingEntry[]> {
    if (entries.length === 0) return [];

    const placeholders: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const e of entries) {
      placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(
        e.id, e.storeId, e.entryDate, e.accountCode, e.accountName,
        e.debitAmount, e.creditAmount, e.referenceType, e.referenceId,
        e.description, e.createdAt,
      );
    }

    const text = `
      INSERT INTO accounting_entries (
        id, store_id, entry_date, account_code, account_name,
        debit_amount, credit_amount, reference_type, reference_id,
        description, created_at
      )
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    const res = await query(text, values);
    return res.rows.map((row) => AccountingEntry.fromPersistence(mapToCamelCase(row)));
  }

  async findByReference(
    referenceType: 'order' | 'inventory_import' | 'debt_payment',
    referenceId: string,
  ): Promise<AccountingEntry[]> {
    const res = await query(
      `SELECT * FROM accounting_entries
       WHERE reference_type = $1 AND reference_id = $2
       ORDER BY entry_date ASC`,
      [referenceType, referenceId],
    );
    return res.rows.map((row) => AccountingEntry.fromPersistence(mapToCamelCase(row)));
  }

  async findByStoreAndPeriod(
    storeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<AccountingEntry[]> {
    const res = await query(
      `SELECT * FROM accounting_entries
       WHERE store_id = $1 AND entry_date >= $2 AND entry_date <= $3
       ORDER BY entry_date ASC, account_code ASC`,
      [storeId, fromDate, toDate],
    );
    return res.rows.map((row) => AccountingEntry.fromPersistence(mapToCamelCase(row)));
  }

  async getTrialBalance(storeId: string, fromDate: Date, toDate: Date): Promise<TrialBalanceRow[]> {
    const text = `
      SELECT
        e.account_code AS "accountCode",
        e.account_name AS "accountName",
        COALESCE(ac.account_type, 'expense') AS "accountType",
        SUM(CASE WHEN e.entry_date < $2 THEN e.debit_amount ELSE 0 END)  AS "openingDebit",
        SUM(CASE WHEN e.entry_date < $2 THEN e.credit_amount ELSE 0 END) AS "openingCredit",
        SUM(CASE WHEN e.entry_date >= $2 AND e.entry_date <= $3 THEN e.debit_amount ELSE 0 END)  AS "debit",
        SUM(CASE WHEN e.entry_date >= $2 AND e.entry_date <= $3 THEN e.credit_amount ELSE 0 END) AS "credit"
      FROM accounting_entries e
      LEFT JOIN account_chart ac ON ac.code = e.account_code
      WHERE e.store_id = $1
      GROUP BY e.account_code, e.account_name, ac.account_type
      ORDER BY e.account_code ASC
    `;

    const res = await query(text, [storeId, fromDate, toDate]);
    const rows: TrialBalanceRow[] = res.rows.map((row) => {
      const accountType = row.accountType as TrialBalanceRow['accountType'];
      const openingDebit = parseFloat(row.openingDebit) || 0;
      const openingCredit = parseFloat(row.openingCredit) || 0;
      const debit = parseFloat(row.debit) || 0;
      const credit = parseFloat(row.credit) || 0;

      // Số dư cuối kỳ theo phân loại: tài sản/chi phí mang nợ (debit), còn lại mang có (credit).
      const debitLike = accountType === 'asset' || accountType === 'expense';
      let closingDebit: number;
      let closingCredit: number;
      if (debitLike) {
        const net = openingDebit + debit - credit;
        if (net >= 0) { closingDebit = net; closingCredit = 0; }
        else { closingDebit = 0; closingCredit = -net; }
      } else {
        const net = openingCredit + credit - debit;
        if (net >= 0) { closingCredit = net; closingDebit = 0; }
        else { closingCredit = 0; closingDebit = -net; }
      }

      return {
        accountCode: row.accountCode,
        accountName: row.accountName,
        accountType,
        openingDebit,
        openingCredit,
        debit,
        credit,
        closingDebit,
        closingCredit,
      };
    });

    return rows;
  }

  async getBusinessResult(storeId: string, fromDate: Date, toDate: Date): Promise<BusinessResultRow[]> {
    const text = `
      SELECT
        account_code AS "accountCode",
        account_name AS "accountName",
        SUM(debit_amount) AS "debit",
        SUM(credit_amount) AS "credit"
      FROM accounting_entries
      WHERE store_id = $1 AND entry_date >= $2 AND entry_date <= $3
        AND account_code IN ('511', '632', '641', '642')
      GROUP BY account_code, account_name
      ORDER BY account_code ASC
    `;

    const res = await query(text, [storeId, fromDate, toDate]);
    return res.rows.map((row) => ({
      accountCode: row.accountCode,
      accountName: row.accountName,
      debit: parseFloat(row.debit) || 0,
      credit: parseFloat(row.credit) || 0,
    }));
  }

  async getDebtMovement(storeId: string, fromDate: Date, toDate: Date): Promise<DebtMovementRow[]> {
    const text = `
      WITH payment_period AS (
        SELECT customer_id, COALESCE(SUM(amount), 0) AS collected
        FROM debt_payments
        WHERE store_id = $1 AND created_at >= $2 AND created_at <= $3
        GROUP BY customer_id
      ),
      payment_opening AS (
        SELECT customer_id, COALESCE(SUM(amount), 0) AS collected_prior
        FROM debt_payments
        WHERE store_id = $1 AND created_at < $2
        GROUP BY customer_id
      ),
      order_period AS (
        SELECT customer_id, COALESCE(SUM(debt_amount), 0) AS accrued
        FROM orders
        WHERE store_id = $1 AND status = 'confirmed' AND created_at >= $2 AND created_at <= $3
        GROUP BY customer_id
      ),
      order_opening AS (
        SELECT customer_id, COALESCE(SUM(debt_amount), 0) AS accrued_prior
        FROM orders
        WHERE store_id = $1 AND status = 'confirmed' AND created_at < $2
        GROUP BY customer_id
      )
      SELECT
        c.id AS "customerId",
        c.name AS "customerName",
        c.phone AS "customerPhone",
        COALESCE(op.accrued_prior, 0) - COALESCE(po.collected_prior, 0) AS "openingDebt",
        COALESCE(p.accrued, 0) AS "accrued",
        COALESCE(pp2.collected, 0) AS "collected",
        COALESCE(op.accrued_prior, 0) + COALESCE(p.accrued, 0)
          - COALESCE(pp.collected_prior, 0) - COALESCE(pp2.collected, 0) AS "closingDebt"
      FROM customers c
      LEFT JOIN order_opening op  ON op.customer_id = c.id
      LEFT JOIN order_period p    ON p.customer_id = c.id
      LEFT JOIN payment_opening pp  ON pp.customer_id = c.id
      LEFT JOIN payment_period pp2 ON pp2.customer_id = c.id
      WHERE c.store_id = $1
        AND (COALESCE(op.accrued_prior, 0) - COALESCE(pp.collected_prior, 0)
           + COALESCE(p.accrued, 0) - COALESCE(pp2.collected, 0)) <> 0
      ORDER BY c.name ASC
    `;

    const res = await query(text, [storeId, fromDate, toDate]);
    return res.rows.map((row) => ({
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone ?? null,
      openingDebt: parseFloat(row.openingDebt) || 0,
      accrued: parseFloat(row.accrued) || 0,
      collected: parseFloat(row.collected) || 0,
      closingDebt: parseFloat(row.closingDebt) || 0,
    }));
  }
}