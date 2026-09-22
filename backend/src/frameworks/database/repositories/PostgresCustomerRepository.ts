import { Customer } from '../../../core/entities/Customer.js';
import { ICustomerRepository, CustomerFilter, PaginatedResult } from '../../../core/repositories/ICustomerRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresCustomerRepository implements ICustomerRepository {
  async findById(id: string): Promise<Customer | null> {
    const res = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByStoreId(storeId: string): Promise<Customer[]> {
    const res = await query('SELECT * FROM customers WHERE store_id = $1', [storeId]);
    return res.rows.map(row => Customer.fromPersistence(mapToCamelCase(row)));
  }

  async findByPhone(storeId: string, phone: string): Promise<Customer | null> {
    const res = await query('SELECT * FROM customers WHERE store_id = $1 AND phone = $2', [storeId, phone]);
    if (res.rowCount === 0) return null;
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async create(customer: Customer): Promise<Customer> {
    const text = `
      INSERT INTO customers (
        id, store_id, name, phone, email, address, note,
        debt_balance, credit_limit, payment_term_days, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      customer.id,
      customer.storeId,
      customer.name,
      customer.phone,
      customer.email,
      customer.address,
      customer.note,
      customer.debtBalance,
      customer.creditLimit,
      customer.paymentTermDays,
      customer.isActive,
      customer.createdAt,
      customer.updatedAt,
    ];

    const res = await query(text, values);
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async update(
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'note' | 'creditLimit' | 'paymentTermDays' | 'isActive'>>
  ): Promise<Customer> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${dbColumn} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Customer not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Customer not found');
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM customers WHERE id = $1', [id]);
  }

  async updateDebtBalance(id: string, amount: number): Promise<Customer> {
    const text = `
      UPDATE customers
      SET debt_balance = debt_balance + $1, updated_at = $2
      WHERE id = $3
      RETURNING *
    `;
    const res = await query(text, [amount, new Date(), id]);
    if (res.rowCount === 0) throw new Error('Customer not found');
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async search(filter: CustomerFilter): Promise<PaginatedResult<Customer>> {
    const conditions: string[] = ['c.store_id = $1'];
    const params: any[] = [filter.storeId];
    let idx = 2;

    if (filter.isActive !== undefined) {
      conditions.push(`c.is_active = $${idx++}`);
      params.push(filter.isActive);
    }
    if (filter.search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }
    if (filter.filter === 'has_debt') {
      conditions.push(`c.debt_balance > 0`);
    } else if (filter.filter === 'no_debt') {
      conditions.push(`c.debt_balance = 0`);
    } else if (filter.filter === 'overdue') {
      conditions.push(`(c.debt_balance > 0 AND (
        EXISTS (
          SELECT 1 FROM orders o
          WHERE o.customer_id = c.id
            AND o.status = 'confirmed'
            AND (o.created_at + (c.payment_term_days || ' days')::INTERVAL) < NOW()
        ) OR (
          c.created_at + (c.payment_term_days || ' days')::INTERVAL < NOW()
        )
      ))`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Count total
    const countRes = await query(`SELECT COUNT(*) FROM customers c ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT c.*,
        COALESCE(pc.total_purchases, 0) AS total_purchases,
        pc.last_purchase_date
       FROM customers c
       LEFT JOIN (
         SELECT customer_id,
                COUNT(*) FILTER (WHERE status = 'confirmed') AS total_purchases,
                MAX(created_at) FILTER (WHERE status = 'confirmed') AS last_purchase_date
         FROM orders
         GROUP BY customer_id
       ) pc ON pc.customer_id = c.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const data = dataRes.rows.map(row => {
      const customer = Customer.fromPersistence(mapToCamelCase(row));
      customer.totalPurchases = parseInt(row.total_purchases, 10) || 0;
      customer.lastPurchaseDate = row.last_purchase_date ? new Date(row.last_purchase_date) : null;
      return customer;
    });

    return { data, total, page, limit };
  }
}
