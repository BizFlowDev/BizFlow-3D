import { Store } from '../../../core/entities/Store.js';
import {
  IStoreRepository,
  AdminStoreFilter,
  AdminStoreResult,
  AdminStoreRow,
  TopStoreRow,
} from '../../../core/repositories/IStoreRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

const ADMIN_STORE_SELECT = `
  SELECT
    s.id,
    s.name,
    s.address,
    s.phone,
    s.email,
    s.tax_code,
    s.subscription_plan,
    CASE
      WHEN s.subscription_status = 'active' AND s.subscription_expires_at IS NOT NULL AND s.subscription_expires_at < NOW() THEN 'expired'
      ELSE s.subscription_status
    END AS subscription_status,
    s.subscription_expires_at,
    s.created_at,
    s.updated_at,
    owner.full_name AS "ownerName",
    owner.email AS "ownerEmail",
    COALESCE(owner.is_active, true) AS "ownerIsActive",
    (SELECT COUNT(*)::int FROM users u WHERE u.store_id = s.id AND u.role = 'employee') AS "employeeCount",
    (SELECT COUNT(*)::int FROM orders o WHERE o.store_id = s.id) AS "totalOrders",
    (SELECT COALESCE(SUM(o.final_amount), 0)::float8 FROM orders o
       WHERE o.store_id = s.id AND o.status = 'confirmed') AS "totalRevenue"
  FROM stores s
  LEFT JOIN users owner ON owner.store_id = s.id AND owner.role = 'owner'
`;

function adminStoreFilterClauses(filter: AdminStoreFilter): { where: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  if (filter.search) {
    params.push(filter.search);
    clauses.push(`(
      s.name ILIKE '%' || $${params.length} || '%'
      OR owner.full_name ILIKE '%' || $${params.length} || '%'
      OR s.phone ILIKE '%' || $${params.length} || '%'
      OR s.email ILIKE '%' || $${params.length} || '%'
    )`);
  }
  if (filter.status) {
    if (filter.status === 'locked') {
      clauses.push(`COALESCE(owner.is_active, true) = false`);
    } else if (filter.status === 'active') {
      clauses.push(`(COALESCE(owner.is_active, true) = true AND s.subscription_status = 'active' AND (s.subscription_expires_at IS NULL OR s.subscription_expires_at >= NOW()))`);
    } else if (filter.status === 'expired') {
      clauses.push(`(COALESCE(owner.is_active, true) = true AND (s.subscription_status = 'expired' OR (s.subscription_status = 'active' AND s.subscription_expires_at IS NOT NULL AND s.subscription_expires_at < NOW())))`);
    } else if (filter.status === 'trial') {
      clauses.push(`s.subscription_status = 'trial'`);
    }
  }
  if (filter.plan) {
    params.push(filter.plan);
    clauses.push(`s.subscription_plan = $${params.length}`);
  }

  return { where: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function mapAdminStoreRow(row: any): AdminStoreRow {
  const camel = mapToCamelCase(row);
  const isLocked = camel.ownerIsActive === false;
  return {
    ...camel,
    isLocked,
    employeeCount: parseInt(camel.employeeCount, 10) || 0,
    totalOrders: parseInt(camel.totalOrders, 10) || 0,
    totalRevenue: parseFloat(camel.totalRevenue) || 0,
    subscriptionExpiresAt: camel.subscriptionExpiresAt
      ? new Date(camel.subscriptionExpiresAt).toISOString()
      : null,
    createdAt: new Date(camel.createdAt).toISOString(),
    updatedAt: new Date(camel.updatedAt).toISOString(),
  };
}

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
        bank_code, bank_account_number, bank_account_holder,
        subscription_plan, subscription_status, subscription_expires_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      store.id,
      store.name,
      store.address,
      store.phone,
      store.email,
      store.taxCode,
      store.bankCode,
      store.bankAccountNumber,
      store.bankAccountHolder,
      store.subscriptionPlan,
      store.subscriptionStatus,
      store.subscriptionExpiresAt,
      store.createdAt,
      store.updatedAt,
    ];

    const res = await query(text, values);
    return Store.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async update(id: string, data: Partial<Pick<Store, 'name' | 'address' | 'phone' | 'email' | 'taxCode' | 'bankCode' | 'bankAccountNumber' | 'bankAccountHolder'>>): Promise<Store> {
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
      subscriptionPlan: string;
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

  // ── Admin aggregate queries ──

  async searchAdmin(filter: AdminStoreFilter): Promise<AdminStoreResult> {
    // Tự động đồng bộ các store đã quá hạn thành 'expired' trong database
    query(
      `UPDATE stores
       SET subscription_status = 'expired', updated_at = NOW()
       WHERE subscription_status = 'active'
         AND subscription_expires_at IS NOT NULL
         AND subscription_expires_at < NOW()`,
    ).catch((err) => console.error('[Auto-Expire Stores Sync Error]:', err));

    const { where, params } = adminStoreFilterClauses(filter);

    const countRes = await query(
      `SELECT COUNT(*)::int AS total
       FROM stores s
       LEFT JOIN users owner ON owner.store_id = s.id AND owner.role = 'owner'
       ${where}`,
      params,
    );
    const total = parseInt(countRes.rows[0].total, 10) || 0;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `${ADMIN_STORE_SELECT} ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return { data: dataRes.rows.map(mapAdminStoreRow), total, page, limit };
  }

  async findAdminById(id: string): Promise<AdminStoreRow | null> {
    const res = await query(`${ADMIN_STORE_SELECT} WHERE s.id = $1`, [id]);
    if (res.rowCount === 0) return null;
    return mapAdminStoreRow(res.rows[0]);
  }

  async countAll(): Promise<number> {
    const res = await query('SELECT COUNT(*)::int AS total FROM stores');
    return parseInt(res.rows[0].total, 10) || 0;
  }

  async countActiveSubscriptions(): Promise<number> {
    const res = await query(
      `SELECT COUNT(*)::int AS total FROM stores
       WHERE subscription_status = 'active'
         AND (subscription_expires_at IS NULL OR subscription_expires_at >= NOW())`,
    );
    return parseInt(res.rows[0].total, 10) || 0;
  }

  async getMrr(basicPrice: number, professionalPrice: number): Promise<number> {
    const res = await query(
      `SELECT COALESCE(SUM(
         CASE WHEN subscription_plan = 'professional' THEN $1::numeric ELSE $2::numeric END
       ), 0)::float8 AS mrr
       FROM stores
       WHERE subscription_status = 'active'
         AND (subscription_expires_at IS NULL OR subscription_expires_at >= NOW())`,
      [professionalPrice, basicPrice],
    );
    return parseFloat(res.rows[0].mrr) || 0;
  }

  async getNewRegistrations(months: number): Promise<{ date: string; count: number }[]> {
    const res = await query(
      `SELECT to_char(DATE_TRUNC('month', created_at), 'YYYY-MM-DD') AS date,
              COUNT(*)::int AS count
       FROM stores
       WHERE created_at >= DATE_TRUNC('month', NOW()) - ($1::int - 1) * INTERVAL '1 month'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [months],
    );
    return res.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10) || 0,
    }));
  }

  async getTopStoresByRevenue(limit: number): Promise<TopStoreRow[]> {
    const res = await query(
      `SELECT s.id,
              s.name,
              s.subscription_plan AS plan,
              COALESCE(SUM(o.final_amount), 0)::float8 AS revenue,
              COUNT(o.id)::int AS orders
       FROM stores s
       LEFT JOIN orders o ON o.store_id = s.id AND o.status = 'confirmed'
       GROUP BY s.id, s.name, s.subscription_plan
       ORDER BY revenue DESC
       LIMIT $1`,
      [limit],
    );
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      revenue: parseFloat(row.revenue) || 0,
      orders: parseInt(row.orders, 10) || 0,
      plan: row.plan,
    }));
  }
}
