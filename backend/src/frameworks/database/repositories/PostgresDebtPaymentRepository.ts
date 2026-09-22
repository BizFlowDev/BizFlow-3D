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
      `SELECT dp.*, u.full_name AS created_by_name 
       FROM debt_payments dp
       LEFT JOIN users u ON u.id = dp.created_by
       WHERE dp.customer_id = $1 
       ORDER BY dp.created_at DESC`,
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
        customer_id as "customerId",
        name as "customerName",
        phone as "customerPhone",
        current_debt as "currentDebt",
        total_paid as "totalPaid",
        total_debt_created as "totalDebtCreated",
        remaining_debt as "remainingDebt"
      FROM vw_customer_debt_summary
      WHERE store_id = $1
      ORDER BY current_debt DESC
    `;
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
        customer_id as "customerId",
        name as "customerName",
        phone as "customerPhone",
        current_debt as "currentDebt",
        total_paid as "totalPaid",
        total_debt_created as "totalDebtCreated",
        remaining_debt as "remainingDebt"
      FROM vw_customer_debt_summary
      WHERE customer_id = $1
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
