import {
  ISubscriptionOrderRepository,
  SubscriptionOrderFilter,
  SubscriptionOrderListResult,
} from '../../../core/repositories/ISubscriptionOrderRepository.js';
import { SubscriptionOrder, SubscriptionOrderStatus } from '../../../core/entities/SubscriptionOrder.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

function mapRow(row: any): SubscriptionOrder {
  const camel = mapToCamelCase(row);
  return SubscriptionOrder.fromPersistence(camel);
}

export class PostgresSubscriptionOrderRepository implements ISubscriptionOrderRepository {
  async findById(id: string): Promise<SubscriptionOrder | null> {
    const res = await query('SELECT * FROM subscription_orders WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  async findByStripeSessionId(sessionId: string): Promise<SubscriptionOrder | null> {
    const res = await query(
      'SELECT * FROM subscription_orders WHERE stripe_session_id = $1',
      [sessionId],
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  async findLatestPendingByStoreId(storeId: string): Promise<SubscriptionOrder | null> {
    const res = await query(
      `SELECT * FROM subscription_orders 
       WHERE store_id = $1 AND status = 'pending'
       ORDER BY created_at DESC 
       LIMIT 1`,
      [storeId],
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }

  async findAll(filter?: SubscriptionOrderFilter): Promise<SubscriptionOrderListResult> {
    const page = filter?.page ?? 1;
    const limit = filter?.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (filter?.storeId) {
      conditions.push(`store_id = $${idx++}`);
      vals.push(filter.storeId);
    }
    if (filter?.status) {
      conditions.push(`status = $${idx++}`);
      vals.push(filter.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM subscription_orders ${whereClause}`,
      vals,
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const dataRes = await query(
      `SELECT * FROM subscription_orders 
       ${whereClause} 
       ORDER BY created_at DESC 
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

  async create(order: SubscriptionOrder): Promise<SubscriptionOrder> {
    const res = await query(
      `INSERT INTO subscription_orders (
         id, store_id, plan_id, plan_slug, duration_months,
         amount, currency, payment_method, status,
         stripe_session_id, stripe_payment_intent_id,
         checkout_url, qr_code_url, metadata,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        order.id,
        order.storeId,
        order.planId,
        order.planSlug,
        order.durationMonths,
        order.amount,
        order.currency,
        order.paymentMethod,
        order.status,
        order.stripeSessionId,
        order.stripePaymentIntentId,
        order.checkoutUrl,
        order.qrCodeUrl,
        JSON.stringify(order.metadata),
        order.createdAt,
        order.updatedAt,
      ],
    );
    return mapRow(res.rows[0]);
  }

  async updateStatus(
    id: string,
    status: SubscriptionOrderStatus,
    extra?: {
      stripePaymentIntentId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<SubscriptionOrder | null> {
    const sets = ['status = $2', 'updated_at = NOW()'];
    const vals: any[] = [id, status];
    let idx = 3;

    if (extra?.stripePaymentIntentId) {
      sets.push(`stripe_payment_intent_id = $${idx++}`);
      vals.push(extra.stripePaymentIntentId);
    }
    if (extra?.metadata) {
      sets.push(`metadata = metadata || $${idx++}::jsonb`);
      vals.push(JSON.stringify(extra.metadata));
    }

    const res = await query(
      `UPDATE subscription_orders 
       SET ${sets.join(', ')} 
       WHERE id = $1 
       RETURNING *`,
      vals,
    );
    if (res.rows.length === 0) return null;
    return mapRow(res.rows[0]);
  }
}
