import type { IUnitOfWork } from '../../core/repositories/IUnitOfWork.js';
import { query, transaction } from './connection.js';

export class PostgresUnitOfWork implements IUnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return transaction(() => work());
  }

  async lock(resource: 'order' | 'customer' | 'product', id: string, storeId: string): Promise<boolean> {
    const table = { order: 'orders', customer: 'customers', product: 'products' }[resource];
    const result = await query(`SELECT id FROM ${table} WHERE id = $1 AND store_id = $2 FOR UPDATE`, [id, storeId]);
    return result.rows.length > 0;
  }
}
