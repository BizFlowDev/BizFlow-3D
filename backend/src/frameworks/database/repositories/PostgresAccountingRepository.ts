import { AccountingEntry } from '../../../core/entities/AccountingEntry.js';
import {
  IAccountingRepository,
  AccountingPosting, ReportWarning,
  TrialBalanceRow,
  BusinessResultRow,
  DebtMovementRow,
} from '../../../core/repositories/IAccountingRepository.js';
import { query, transaction } from '../connection.js';
import { ValidationError } from '../../../core/errors/ValidationError.js';
import type { DailyRevenueRow } from '../../../core/repositories/IOrderRepository.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresAccountingRepository implements IAccountingRepository {
  constructor(private readonly runQuery: typeof query = query) {}
  async postBalanced({ entries, costStatus, missingProductIds }: AccountingPosting): Promise<void> {
    const first = entries[0];
    if (!first || entries.some(e => e.storeId !== first.storeId || e.referenceType !== first.referenceType || e.referenceId !== first.referenceId ||
      !Number.isSafeInteger(e.debitAmount) || !Number.isSafeInteger(e.creditAmount) || e.debitAmount < 0 || e.creditAmount < 0) ||
      entries.reduce((sum, e) => sum + BigInt(e.debitAmount) - BigInt(e.creditAmount), 0n) !== 0n) {
      throw new ValidationError('Nhóm bút toán không hợp lệ hoặc không cân bằng Nợ/Có');
    }
    await transaction(async () => {
      // Serialize all writers for this source, including a direct retry.
      await this.runQuery('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${first.storeId}:${first.referenceType}:${first.referenceId}`]);
      const posted = await this.runQuery('SELECT id FROM accounting_postings WHERE store_id=$1 AND reference_type=$2 AND reference_id=$3', [first.storeId, first.referenceType, first.referenceId]);
      if (posted.rows.length) return;
      const legacy = await this.runQuery('SELECT id FROM accounting_entries WHERE store_id=$1 AND reference_type=$2 AND reference_id=$3 LIMIT 1', [first.storeId, first.referenceType, first.referenceId]);
      if (legacy.rows.length) throw new ValidationError('Nghiệp vụ đã có bút toán cũ, cần đối soát trước khi hạch toán lại');
      await this.runQuery(`INSERT INTO accounting_postings (store_id, reference_type, reference_id, entry_date, cost_status, missing_product_ids)
        VALUES ($1,$2,$3,$4,$5,$6)`, [first.storeId, first.referenceType, first.referenceId, first.entryDate, costStatus, missingProductIds]);
      await this.createMany(entries);
    });
  }

  async getRevenueLedger(storeId: string, from: Date, to: Date): Promise<DailyRevenueRow[]> {
    const result = await this.runQuery(`SELECT TO_CHAR(COALESCE(confirmed_at,updated_at) AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date,
      SUM(final_amount) AS revenue, COUNT(*) AS count FROM orders
      WHERE store_id=$1 AND status='confirmed' AND COALESCE(confirmed_at,updated_at)>=$2 AND COALESCE(confirmed_at,updated_at)<$3
      GROUP BY date ORDER BY date`, [storeId,from,to]);
    return result.rows.map(r => ({ date: r.date, totalRevenue: Number(r.revenue), orderCount: Number(r.count) }));
  }

  async getReportWarnings(storeId: string, from: Date, to: Date): Promise<ReportWarning[]> {
    const result = await this.runQuery(`
      WITH sources AS (
        SELECT 'order' AS type,id,COALESCE(confirmed_at,updated_at) AS date FROM orders WHERE store_id=$1 AND status='confirmed'
        UNION ALL SELECT 'inventory_import',id,created_at FROM inventory_transactions WHERE store_id=$1 AND type='import'
        UNION ALL SELECT 'debt_payment',id,created_at FROM debt_payments WHERE store_id=$1
      ), journal AS (
        SELECT reference_type,reference_id,SUM(debit_amount-credit_amount) AS net FROM accounting_entries
        WHERE store_id=$1 AND entry_date<$3 GROUP BY reference_type,reference_id
      )
      SELECT 'UNBALANCED_POSTING' AS code,COUNT(*) AS count FROM journal WHERE net<>0
      UNION ALL SELECT 'ORPHAN_POSTING',COUNT(*) FROM journal j WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.type=j.reference_type AND s.id=j.reference_id)
      UNION ALL SELECT 'MISSING_COST',COUNT(*) FROM accounting_postings WHERE store_id=$1 AND entry_date<$3 AND cost_status='missing'
      UNION ALL SELECT 'ESTIMATED_COST',COUNT(*) FROM accounting_postings WHERE store_id=$1 AND entry_date>=$2 AND entry_date<$3 AND cost_status='estimated'
      UNION ALL SELECT 'LEGACY_UNVERIFIED',COUNT(*) FROM sources s LEFT JOIN accounting_postings p ON p.store_id=$1 AND p.reference_type=s.type AND p.reference_id=s.id
        WHERE s.date<$3 AND p.id IS NULL
      UNION ALL SELECT 'MISSING_POSTING',COUNT(*) FROM sources s LEFT JOIN journal j ON j.reference_type=s.type AND j.reference_id=s.id WHERE s.date<$3 AND j.reference_id IS NULL
      UNION ALL SELECT 'REVENUE_MISMATCH',CASE WHEN
        COALESCE((SELECT SUM(final_amount) FROM orders WHERE store_id=$1 AND status='confirmed' AND COALESCE(confirmed_at,updated_at)>=$2 AND COALESCE(confirmed_at,updated_at)<$3),0)
        <> COALESCE((SELECT SUM(credit_amount-debit_amount) FROM accounting_entries WHERE store_id=$1 AND account_code='511' AND entry_date>=$2 AND entry_date<$3),0) THEN 1 ELSE 0 END
      UNION ALL SELECT 'DEBT_MISMATCH',CASE WHEN
        COALESCE((SELECT SUM(debt_amount) FROM orders WHERE store_id=$1 AND status='confirmed' AND COALESCE(confirmed_at,updated_at)<$3),0)
        - COALESCE((SELECT SUM(amount) FROM debt_payments WHERE store_id=$1 AND created_at<$3),0)
        <> COALESCE((SELECT SUM(debit_amount-credit_amount) FROM accounting_entries WHERE store_id=$1 AND account_code='131' AND entry_date<$3),0) THEN 1 ELSE 0 END
    `, [storeId,from,to]);
    const messages: Record<string,string> = {
      ORPHAN_POSTING: 'Có bút toán không còn giao dịch gốc; cần chứng từ để xử lý.',
      UNBALANCED_POSTING: 'Có nhóm bút toán mất cân bằng, cần đối soát.', MISSING_COST: 'Có giao dịch chưa đủ căn cứ giá vốn; lợi nhuận cần đối soát.',
      ESTIMATED_COST: 'Có giá vốn ước tính hoặc giá nhập cũ chỉ được đối soát nội bộ.', LEGACY_UNVERIFIED: 'Dữ liệu cũ chưa được xác minh giá vốn và tính đầy đủ.',
      MISSING_POSTING: 'Có giao dịch chưa có bút toán.', REVENUE_MISMATCH: 'Doanh thu nghiệp vụ khác sổ cái.', DEBT_MISMATCH: 'Công nợ nghiệp vụ khác sổ cái.',
    };
    return result.rows.filter(r => Number(r.count)>0).map(r => ({ code:r.code, count:Number(r.count),
      severity: ['ORPHAN_POSTING','UNBALANCED_POSTING','MISSING_POSTING','REVENUE_MISMATCH','DEBT_MISMATCH'].includes(r.code) ? 'error' : 'warning', message: messages[r.code] }));
  }

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

    const res = await this.runQuery(text, values);
    return res.rows.map((row) => AccountingEntry.fromPersistence(mapToCamelCase(row)));
  }

  async findByReference(
    referenceType: 'order' | 'inventory_import' | 'debt_payment',
    referenceId: string,
  ): Promise<AccountingEntry[]> {
    const res = await this.runQuery(
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
    const res = await this.runQuery(
      `SELECT * FROM accounting_entries
       WHERE store_id = $1 AND entry_date >= $2 AND entry_date < $3
       ORDER BY entry_date ASC, account_code ASC`,
      [storeId, fromDate, toDate],
    );
    return res.rows.map((row) => AccountingEntry.fromPersistence(mapToCamelCase(row)));
  }

  async getTrialBalance(storeId: string, fromDate: Date, toDate: Date): Promise<TrialBalanceRow[]> {
    const text = `
      SELECT
        e.account_code AS "accountCode",
        COALESCE(MAX(ac.name), MIN(e.account_name)) AS "accountName",
        COALESCE(ac.account_type, 'expense') AS "accountType",
        SUM(CASE WHEN e.entry_date < $2 THEN e.debit_amount ELSE 0 END)  AS "openingDebit",
        SUM(CASE WHEN e.entry_date < $2 THEN e.credit_amount ELSE 0 END) AS "openingCredit",
        SUM(CASE WHEN e.entry_date >= $2 AND e.entry_date < $3 THEN e.debit_amount ELSE 0 END)  AS "debit",
        SUM(CASE WHEN e.entry_date >= $2 AND e.entry_date < $3 THEN e.credit_amount ELSE 0 END) AS "credit"
      FROM accounting_entries e
      LEFT JOIN account_chart ac ON ac.code = e.account_code
      WHERE e.store_id = $1 AND e.entry_date < $3
      GROUP BY e.account_code, ac.account_type
      ORDER BY e.account_code ASC
    `;

    const res = await this.runQuery(text, [storeId, fromDate, toDate]);
    const rows: TrialBalanceRow[] = res.rows.map((row) => {
      const accountType = row.accountType as TrialBalanceRow['accountType'];
      const openingDebit = parseFloat(row.openingDebit) || 0;
      const openingCredit = parseFloat(row.openingCredit) || 0;
      const debit = parseFloat(row.debit) || 0;
      const credit = parseFloat(row.credit) || 0;

      const openingNet = openingDebit - openingCredit;
      const closingNet = openingNet + debit - credit;
      const closingDebit = Math.max(closingNet, 0);
      const closingCredit = Math.max(-closingNet, 0);

      return {
        accountCode: row.accountCode,
        accountName: row.accountName,
        accountType,
        openingDebit: Math.max(openingNet, 0),
        openingCredit: Math.max(-openingNet, 0),
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
        COALESCE(MAX(ac.name), MIN(e.account_name)) AS "accountName",
        SUM(debit_amount) AS "debit",
        SUM(credit_amount) AS "credit"
      FROM accounting_entries e LEFT JOIN account_chart ac ON ac.code = e.account_code
      WHERE store_id = $1 AND entry_date >= $2 AND entry_date < $3
        AND account_code IN ('511', '632', '641', '642')
      GROUP BY account_code
      ORDER BY account_code ASC
    `;

    const res = await this.runQuery(text, [storeId, fromDate, toDate]);
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
        WHERE store_id = $1 AND created_at >= $2 AND created_at < $3
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
        WHERE store_id = $1 AND status = 'confirmed' AND COALESCE(confirmed_at, updated_at) >= $2 AND COALESCE(confirmed_at, updated_at) < $3
        GROUP BY customer_id
      ),
      order_opening AS (
        SELECT customer_id, COALESCE(SUM(debt_amount), 0) AS accrued_prior
        FROM orders
        WHERE store_id = $1 AND status = 'confirmed' AND COALESCE(confirmed_at, updated_at) < $2
        GROUP BY customer_id
      )
      SELECT
        c.id AS "customerId",
        c.name AS "customerName",
        c.phone AS "customerPhone",
        COALESCE(op.accrued_prior, 0) - COALESCE(pp.collected_prior, 0) AS "openingDebt",
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
        AND (COALESCE(op.accrued_prior, 0) - COALESCE(pp.collected_prior, 0) <> 0
          OR COALESCE(p.accrued, 0) <> 0 OR COALESCE(pp2.collected, 0) <> 0)
      ORDER BY c.name ASC
    `;

    const res = await this.runQuery(text, [storeId, fromDate, toDate]);
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

  async getProductAverageCosts(storeId: string, productIds: string[], asOf: Date): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();

    const text = `
      SELECT
        it.product_id AS "productId",
        COALESCE(SUM(ae.debit_amount), 0) AS "totalCost",
        COALESCE(SUM(it.quantity * COALESCE(pu.conversion_factor, 1)), 0) AS "totalBaseQty"
      FROM inventory_transactions it
      LEFT JOIN product_units pu ON pu.id = it.product_unit_id
      JOIN accounting_entries ae
        ON ae.reference_type = 'inventory_import'
        AND ae.reference_id = it.id
        AND ae.account_code = '156'
      WHERE it.store_id = $1
        AND it.product_id = ANY($2::uuid[])
        AND it.type = 'import' AND it.created_at <= $3 AND ae.entry_date <= $3
      GROUP BY it.product_id
    `;

    const res = await this.runQuery(text, [storeId, productIds, asOf]);
    const costMap = new Map<string, number>();

    for (const row of res.rows) {
      const totalCost = parseFloat(row.totalCost) || 0;
      const totalBaseQty = parseFloat(row.totalBaseQty) || 0;
      if (totalBaseQty > 0 && totalCost >= 0) {
        costMap.set(row.productId, totalCost / totalBaseQty);
      }
    }

    return costMap;
  }

  async getUnitConversionFactors(unitIds: string[]): Promise<Map<string, number>> {
    const validIds = unitIds.filter((id): id is string => Boolean(id));
    if (validIds.length === 0) return new Map();

    const res = await this.runQuery(
      `SELECT id, conversion_factor AS "conversionFactor" FROM product_units WHERE id = ANY($1::uuid[])`,
      [validIds],
    );
    const map = new Map<string, number>();
    for (const row of res.rows) {
      map.set(row.id, parseFloat(row.conversionFactor) || 1);
    }
    return map;
  }
}