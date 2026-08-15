import {
  ISubscriptionHistoryRepository,
  SubscriptionHistoryRow,
  CreateHistoryInput,
  HistoryFilter,
  HistoryResult,
} from '../../../core/repositories/ISubscriptionHistoryRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

function mapRow(row: any): SubscriptionHistoryRow {
  const c = mapToCamelCase(row);
  return {
    id: c.id,
    storeId: c.storeId,
    storeName: c.storeName ?? null,
    oldPlan: c.oldPlan ?? null,
    newPlan: c.newPlan,
    oldStatus: c.oldStatus ?? null,
    newStatus: c.newStatus ?? null,
    changedBy: c.changedBy ?? null,
    changedByName: c.changedByName ?? null,
    note: c.note ?? null,
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

export class PostgresSubscriptionHistoryRepository implements ISubscriptionHistoryRepository {
  async findAll(filter?: HistoryFilter): Promise<HistoryResult> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (filter?.storeId) {
      conditions.push(`sh.store_id = $${idx++}`);
      vals.push(filter.storeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM subscription_history sh ${whereClause}`,
      vals,
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const dataRes = await query(
      `SELECT sh.*
       FROM subscription_history sh
       ${whereClause}
       ORDER BY sh.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...vals, limit, offset],
    );

    return {
      items: dataRes.rows.map(mapRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(input: CreateHistoryInput): Promise<SubscriptionHistoryRow> {
    const res = await query(
      `INSERT INTO subscription_history (store_id, store_name, old_plan, new_plan, old_status, new_status, changed_by, changed_by_name, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.storeId,
        input.storeName ?? null,
        input.oldPlan ?? null,
        input.newPlan,
        input.oldStatus ?? null,
        input.newStatus ?? null,
        input.changedBy ?? null,
        input.changedByName ?? null,
        input.note ?? null,
      ],
    );
    return mapRow(res.rows[0]);
  }
}
