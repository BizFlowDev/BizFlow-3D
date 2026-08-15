import {
  ISubscriptionPlanRepository,
  SubscriptionPlanRow,
  CreatePlanInput,
  UpdatePlanInput,
} from '../../../core/repositories/ISubscriptionPlanRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

function mapRow(row: any): SubscriptionPlanRow {
  const c = mapToCamelCase(row);
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    price: Number(c.price),
    features: Array.isArray(c.features) ? c.features : [],
    maxEmployees: Number(c.maxEmployees),
    isActive: c.isActive,
    sortOrder: Number(c.sortOrder),
    colorFrom: c.colorFrom ?? null,
    colorTo: c.colorTo ?? null,
    icon: c.icon ?? null,
    storeCount: c.storeCount !== undefined ? Number(c.storeCount) : undefined,
    createdAt: new Date(c.createdAt).toISOString(),
    updatedAt: new Date(c.updatedAt).toISOString(),
  };
}

export class PostgresSubscriptionPlanRepository implements ISubscriptionPlanRepository {
  async findAll(): Promise<SubscriptionPlanRow[]> {
    const res = await query(
      `SELECT sp.*,
              COALESCE(sc.cnt, 0) AS store_count
       FROM subscription_plans sp
       LEFT JOIN (
         SELECT subscription_plan, COUNT(*) AS cnt
         FROM stores
         GROUP BY subscription_plan
       ) sc ON sc.subscription_plan = sp.slug
       ORDER BY sp.sort_order ASC, sp.created_at ASC`,
    );
    return res.rows.map(mapRow);
  }

  async findBySlug(slug: string): Promise<SubscriptionPlanRow | null> {
    const res = await query(
      `SELECT sp.*,
              COALESCE(sc.cnt, 0) AS store_count
       FROM subscription_plans sp
       LEFT JOIN (
         SELECT subscription_plan, COUNT(*) AS cnt
         FROM stores
         WHERE subscription_plan = $1
         GROUP BY subscription_plan
       ) sc ON sc.subscription_plan = sp.slug
       WHERE sp.slug = $1`,
      [slug],
    );
    if (res.rowCount === 0) return null;
    return mapRow(res.rows[0]);
  }

  async findById(id: string): Promise<SubscriptionPlanRow | null> {
    const res = await query(
      `SELECT sp.*,
              COALESCE(sc.cnt, 0) AS store_count
       FROM subscription_plans sp
       LEFT JOIN (
         SELECT subscription_plan, COUNT(*) AS cnt
         FROM stores
         GROUP BY subscription_plan
       ) sc ON sc.subscription_plan = sp.slug
       WHERE sp.id = $1`,
      [id],
    );
    if (res.rowCount === 0) return null;
    return mapRow(res.rows[0]);
  }

  async create(input: CreatePlanInput): Promise<SubscriptionPlanRow> {
    const res = await query(
      `INSERT INTO subscription_plans (name, slug, description, price, features, max_employees, is_active, sort_order, color_from, color_to, icon)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.name,
        input.slug,
        input.description ?? null,
        input.price,
        JSON.stringify(input.features),
        input.maxEmployees,
        input.isActive ?? true,
        input.sortOrder ?? 0,
        input.colorFrom ?? 'from-blue-500',
        input.colorTo ?? 'to-cyan-500',
        input.icon ?? 'Zap',
      ],
    );
    return mapRow(res.rows[0]);
  }

  async update(id: string, input: UpdatePlanInput): Promise<SubscriptionPlanRow> {
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      sets.push(`name = $${idx++}`);
      vals.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${idx++}`);
      vals.push(input.description);
    }
    if (input.price !== undefined) {
      sets.push(`price = $${idx++}`);
      vals.push(input.price);
    }
    if (input.features !== undefined) {
      sets.push(`features = $${idx++}::jsonb`);
      vals.push(JSON.stringify(input.features));
    }
    if (input.maxEmployees !== undefined) {
      sets.push(`max_employees = $${idx++}`);
      vals.push(input.maxEmployees);
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      vals.push(input.isActive);
    }
    if (input.sortOrder !== undefined) {
      sets.push(`sort_order = $${idx++}`);
      vals.push(input.sortOrder);
    }
    if (input.colorFrom !== undefined) {
      sets.push(`color_from = $${idx++}`);
      vals.push(input.colorFrom);
    }
    if (input.colorTo !== undefined) {
      sets.push(`color_to = $${idx++}`);
      vals.push(input.colorTo);
    }
    if (input.icon !== undefined) {
      sets.push(`icon = $${idx++}`);
      vals.push(input.icon);
    }

    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const res = await query(
      `UPDATE subscription_plans
       SET ${sets.join(', ')}
       WHERE id = $${idx}
       RETURNING *`,
      vals,
    );
    return mapRow(res.rows[0]);
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM subscription_plans WHERE id = $1`, [id]);
  }
}
