import { DebtPayment } from '../../../core/entities/DebtPayment.js';
import { IDebtPaymentRepository, DebtSummaryRow } from '../../../core/repositories/IDebtPaymentRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresDebtPaymentRepository implements IDebtPaymentRepository {
  async findById(id: string): Promise<DebtPayment | null> {
    const res = await query('SELECT * FROM debt_payments WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    return DebtPayment.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByCustomerId(customerId: string): Promise<DebtPayment[]> {
    const res = await query(
      'SELECT * FROM debt_payments WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId]
    );
    return res.rows.map(row => DebtPayment.fromPersistence(mapToCamelCase(row)));
  }

  async create(payment: DebtPayment): Promise<DebtPayment> {
    const text = `
      INSERT INTO debt_payments (
        id, store_id, customer_id, order_id, created_by,
        amount, payment_method, note, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      payment.id,
      payment.storeId,
      payment.customerId,
      payment.orderId,
      payment.createdBy,
      payment.amount,
      payment.paymentMethod,
      payment.note,
      payment.createdAt,
    ];
    
    const res = await query(text, values);
    return DebtPayment.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async getDebtSummary(storeId: string): Promise<DebtSummaryRow[]> {
    const text = `
      SELECT 
        c.id as "customerId",
        c.name as "customerName",
        c.phone as "customerPhone",
        c.debt_balance as "currentDebt",
        COALESCE(SUM(dp.amount), 0) as "totalPaid",
        COALESCE(SUM(o.debt_amount), 0) as "totalDebtCreated",
        c.debt_balance as "remainingDebt"
      FROM customers c
      LEFT JOIN debt_payments dp ON c.id = dp.customer_id
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'confirmed'
      WHERE c.store_id = $1
      GROUP BY c.id, c.name, c.phone, c.debt_balance
      ORDER BY c.debt_balance DESC
    `;
    // If there is a view `vw_customer_debt_summary`, we would use:
    // SELECT * FROM vw_customer_debt_summary WHERE store_id = $1
    // For now, we fallback to a left join to ensure it works regardless of the view.
    
    const res = await query(text, [storeId]);
    return res.rows.map(row => ({
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      currentDebt: parseFloat(row.currentDebt) || 0,
      totalPaid: parseFloat(row.totalPaid) || 0,
      totalDebtCreated: parseFloat(row.totalDebtCreated) || 0,
      remainingDebt: parseFloat(row.remainingDebt) || 0,
    }));
  }

  async getCustomerDebtSummary(customerId: string): Promise<DebtSummaryRow | null> {
    const text = `
      SELECT 
        c.id as "customerId",
        c.name as "customerName",
        c.phone as "customerPhone",
        c.debt_balance as "currentDebt",
        COALESCE(SUM(dp.amount), 0) as "totalPaid",
        COALESCE(SUM(o.debt_amount), 0) as "totalDebtCreated",
        c.debt_balance as "remainingDebt"
      FROM customers c
      LEFT JOIN debt_payments dp ON c.id = dp.customer_id
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'confirmed'
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.phone, c.debt_balance
    `;
    
    const res = await query(text, [customerId]);
    if (res.rowCount === 0) return null;
    
    const row = res.rows[0];
    return {
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      currentDebt: parseFloat(row.currentDebt) || 0,
      totalPaid: parseFloat(row.totalPaid) || 0,
      totalDebtCreated: parseFloat(row.totalDebtCreated) || 0,
      remainingDebt: parseFloat(row.remainingDebt) || 0,
    };
  }
}
