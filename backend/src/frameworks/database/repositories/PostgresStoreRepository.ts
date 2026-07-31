import { Store } from '../../../core/entities/Store.js';
import { IStoreRepository } from '../../../core/repositories/IStoreRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresStoreRepository implements IStoreRepository {
  async findById(id: string): Promise<Store | null> {
    const res = await query('SELECT * FROM stores WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByEmail(email: string): Promise<Store | null> {
    const res = await query('SELECT * FROM stores WHERE email = $1', [email]);
    if (res.rowCount === 0) return null;
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async create(store: Store): Promise<Store> {
    const text = `
      INSERT INTO stores (
        id, name, address, phone, email, tax_code,
        subscription_plan, subscription_status, subscription_expires_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      store.id,
      store.name,
      store.address,
      store.phone,
      store.email,
      store.taxCode,
      store.subscriptionPlan,
      store.subscriptionStatus,
      store.subscriptionExpiresAt,
      store.createdAt,
      store.updatedAt,
    ];

    const res = await query(text, values);
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async update(id: string, data: Partial<Pick<Store, 'name' | 'address' | 'phone' | 'email' | 'taxCode'>>): Promise<Store> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        // Convert camelCase to snake_case for DB columns
        const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${dbColumn} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Store not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE stores
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Store not found');
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM stores WHERE id = $1', [id]);
  }

  async updateSubscription(
    id: string,
    data: {
      subscriptionPlan: 'basic' | 'professional';
      subscriptionStatus: 'active' | 'expired' | 'trial';
      subscriptionExpiresAt: Date | null;
    }
  ): Promise<Store> {
    const text = `
      UPDATE stores
      SET subscription_plan = $1,
          subscription_status = $2,
          subscription_expires_at = $3,
          updated_at = $4
      WHERE id = $5
      RETURNING *
    `;
    const values = [
      data.subscriptionPlan,
      data.subscriptionStatus,
      data.subscriptionExpiresAt,
      new Date(),
      id,
    ];

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Store not found');
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }
}
