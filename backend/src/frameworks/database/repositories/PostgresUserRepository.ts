import { User } from '../../../core/entities/User.js';
import { IUserRepository, EmployeeFilter, EmployeeSearchResult } from '../../../core/repositories/IUserRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresUserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    return User.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByEmail(email: string, storeId?: string | null): Promise<User | null> {
    let text = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const params: any[] = [email];
    if (storeId !== undefined) {
      if (storeId === null) {
        text += ' AND store_id IS NULL';
      } else {
        text += ' AND store_id = $2';
        params.push(storeId);
      }
    }
    const res = await query(text, params);
    if (res.rowCount === 0) return null;
    return User.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByStoreId(storeId: string): Promise<User[]> {
    const res = await query('SELECT * FROM users WHERE store_id = $1 AND deleted_at IS NULL', [storeId]);
    return res.rows.map(row => User.fromPersistence(mapToCamelCase(row)));
  }

  async create(user: User): Promise<User> {
    const text = `
      INSERT INTO users (
        id, store_id, full_name, email, phone, role,
        password_hash, is_active, last_login_at,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      user.id,
      user.storeId,
      user.fullName,
      user.email,
      user.phone,
      user.role,
      user.passwordHash,
      user.isActive,
      user.lastLoginAt,
      user.createdAt,
      user.updatedAt,
    ];

    const res = await query(text, values);
    return User.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async update(
    id: string,
    data: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'role' | 'isActive' | 'passwordHash'>>
  ): Promise<User> {
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
      if (!existing) throw new Error('User not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('User not found');
    return User.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }

  async softDelete(id: string): Promise<void> {
    await query(
      'UPDATE users SET deleted_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1',
      [id],
    );
  }

  async updateStatusByStoreId(storeId: string, isActive: boolean): Promise<void> {
    await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE store_id = $2 AND deleted_at IS NULL',
      [isActive, storeId],
    );
  }

  async updateLastLogin(id: string): Promise<void> {
    await query('UPDATE users SET last_login_at = $1 WHERE id = $2', [new Date(), id]);
  }

  async countNonAdminUsers(): Promise<number> {
    const res = await query(
      `SELECT COUNT(*)::int AS total FROM users WHERE role IN ('owner', 'employee') AND deleted_at IS NULL`,
    );
    return parseInt(res.rows[0].total, 10) || 0;
  }

  async searchEmployees(filter: EmployeeFilter): Promise<EmployeeSearchResult> {
    const conditions = [`store_id = $1`, `role = 'employee'`, `deleted_at IS NULL`];
    const params: any[] = [filter.storeId];
    let idx = 2;

    if (filter.search) {
      conditions.push(`(full_name ILIKE $${idx} OR email ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0].total, 10) || 0;

    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 10, 100);
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT * FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset],
    );

    return {
      data: dataRes.rows.map((row) => User.fromPersistence(mapToCamelCase(row))),
      total,
      page,
      limit,
    };
  }
}
