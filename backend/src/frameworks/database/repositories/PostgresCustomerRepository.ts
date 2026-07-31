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
        debt_balance, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      customer.isActive,
      customer.createdAt,
      customer.updatedAt,
    ];

    const res = await query(text, values);
    return Customer.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async update(
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'note' | 'isActive'>>
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
    const conditions: string[] = ['store_id = $1'];
    const params: any[] = [filter.storeId];
    let idx = 2;

    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(filter.isActive);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR phone ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Count total
    const countRes = await query(`SELECT COUNT(*) FROM customers ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT * FROM customers ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const data = dataRes.rows.map(row => Customer.fromPersistence(mapToCamelCase(row)));

    return { data, total, page, limit };
  }
}
