import { Order } from '../../../core/entities/Order.js';
import { OrderItem } from '../../../core/entities/OrderItem.js';
import { IOrderRepository, OrderFilter, PaginatedResult, DailyRevenueRow, TopProductRow } from '../../../core/repositories/IOrderRepository.js';
import { query, transaction } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresOrderRepository implements IOrderRepository {
  async findById(id: string): Promise<Order | null> {
    const res = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    const order = Order.fromPersistence(mapToCamelCase(res.rows[0]));
    order.items = await this.findItemsByOrderId(id);
    return order;
  }

  async findByStoreId(storeId: string): Promise<Order[]> {
    const res = await query('SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
    return res.rows.map(row => Order.fromPersistence(mapToCamelCase(row)));
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const res = await query('SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC', [customerId]);
    return res.rows.map(row => Order.fromPersistence(mapToCamelCase(row)));
  }

  async create(order: Order): Promise<Order> {
    return transaction(async (txQuery) => {
      const text = `
        INSERT INTO orders (
          id, store_id, customer_id, user_id, order_type,
          status, payment_method, total_amount, discount_amount, final_amount, debt_amount,
          paid_amount, change_amount,
          note, confirmed_by, confirmed_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;
      const values = [
        order.id,
        order.storeId,
        order.customerId,
        order.userId,
        order.orderType,
        order.status,
        order.paymentMethod,
        order.totalAmount,
        order.discountAmount,
        order.finalAmount,
        order.debtAmount,
        order.paidAmount,
        order.changeAmount,
        order.note,
        order.confirmedBy,
        order.confirmedAt,
        order.createdAt,
        order.updatedAt,
      ];
      
      const res = await txQuery(text, values);
      const savedOrder = Order.fromPersistence(mapToCamelCase(res.rows[0]));

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const itemText = `
            INSERT INTO order_items (
              id, order_id, product_id, product_unit_id,
              quantity, unit_price, total_price, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;
          await txQuery(itemText, [
            item.id,
            item.orderId,
            item.productId,
            item.productUnitId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.createdAt,
          ]);
        }
      }

      savedOrder.items = await this.findItemsByOrderId(savedOrder.id);
      return savedOrder;
    });
  }

  async update(
    id: string,
    data: Partial<Pick<Order, 'status' | 'totalAmount' | 'discountAmount' | 'finalAmount' | 'debtAmount' | 'paymentMethod' | 'paidAmount' | 'changeAmount' | 'note' | 'confirmedBy' | 'confirmedAt'>>
  ): Promise<Order> {
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
      if (!existing) throw new Error('Order not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE orders
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Order not found');
    const order = Order.fromPersistence(mapToCamelCase(res.rows[0]));
    order.items = await this.findItemsByOrderId(id);
    return order;
  }

  async confirmOrder(id: string, confirmedBy: string): Promise<Order> {
    const res = await query(
      `UPDATE orders 
       SET status = 'confirmed', confirmed_by = $1, confirmed_at = $2, updated_at = $2 
       WHERE id = $3 
       RETURNING *`,
      [confirmedBy, new Date(), id]
    );
    if (res.rowCount === 0) throw new Error('Order not found');
    const order = Order.fromPersistence(mapToCamelCase(res.rows[0]));
    order.items = await this.findItemsByOrderId(id);
    return order;
  }

  async search(filter: OrderFilter): Promise<PaginatedResult<Order>> {
    const conditions: string[] = ['store_id = $1'];
    const params: any[] = [filter.storeId];
    let idx = 2;

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filter.status);
    }
    if (filter.customerId) {
      conditions.push(`customer_id = $${idx++}`);
      params.push(filter.customerId);
    }
    if (filter.orderType) {
      conditions.push(`order_type = $${idx++}`);
      params.push(filter.orderType);
    }
    if (filter.fromDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filter.fromDate);
    }
    if (filter.toDate) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filter.toDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    const countRes = await query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const data = await Promise.all(dataRes.rows.map(async row => {
      const o = Order.fromPersistence(mapToCamelCase(row));
      o.items = await this.findItemsByOrderId(o.id);
      return o;
    }));

    return { data, total, page, limit };
  }

  // ── Order Items ──
  async findItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    const res = await query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    return res.rows.map(row => OrderItem.fromPersistence(mapToCamelCase(row)));
  }

  async createItem(item: OrderItem): Promise<OrderItem> {
    const text = `
      INSERT INTO order_items (
        id, order_id, product_id, product_unit_id,
        quantity, unit_price, total_price, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const res = await query(text, [
      item.id, item.orderId, item.productId, item.productUnitId,
      item.quantity, item.unitPrice, item.totalPrice, item.createdAt
    ]);
    return OrderItem.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async createItems(items: OrderItem[]): Promise<OrderItem[]> {
    const created: OrderItem[] = [];
    for (const item of items) {
      created.push(await this.createItem(item));
    }
    return created;
  }

  async deleteItemsByOrderId(orderId: string): Promise<void> {
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
  }

  // ── Report queries ──
  async getDailyRevenue(storeId: string, fromDate: Date, toDate: Date): Promise<DailyRevenueRow[]> {
    // Requires a view or explicit grouping. Assuming we have `daily_revenue_view` or similar.
    // Fallback to explicit grouping on `orders` table for now:
    const text = `
      SELECT 
        DATE(created_at) as date,
        SUM(final_amount) as "totalRevenue",
        COUNT(id) as "orderCount"
      FROM orders
      WHERE store_id = $1 AND status = 'confirmed' AND created_at >= $2 AND created_at <= $3
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const res = await query(text, [storeId, fromDate, toDate]);
    return res.rows.map(row => ({
      date: row.date.toISOString ? row.date.toISOString().split('T')[0] : String(row.date),
      totalRevenue: parseFloat(row.totalRevenue) || 0,
      orderCount: parseInt(row.orderCount, 10) || 0,
    }));
  }

  async getTopProducts(storeId: string, limit: number): Promise<TopProductRow[]> {
    // Requires joining order_items, orders, products, and categories
    const text = `
      SELECT 
        p.id as "productId",
        p.code,
        p.name,
        c.name as "categoryName",
        SUM(oi.quantity) as "totalQuantitySold",
        SUM(oi.total_price) as "totalRevenue",
        COUNT(DISTINCT o.id) as "orderCount"
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_categories c ON p.category_id = c.id
      WHERE o.store_id = $1 AND o.status = 'confirmed'
      GROUP BY p.id, p.code, p.name, c.name
      ORDER BY "totalQuantitySold" DESC
      LIMIT $2
    `;
    const res = await query(text, [storeId, limit]);
    return res.rows.map(row => ({
      productId: row.productId,
      code: row.code,
      name: row.name,
      categoryName: row.categoryName,
      totalQuantitySold: parseFloat(row.totalQuantitySold) || 0,
      totalRevenue: parseFloat(row.totalRevenue) || 0,
      orderCount: parseInt(row.orderCount, 10) || 0,
    }));
  }

  // ── Admin queries ──

  async getRecentOrdersByStore(storeId: string, limit: number): Promise<{
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[]> {
    const res = await query(
      `SELECT id, final_amount AS "totalAmount", status, created_at AS "createdAt"
       FROM orders
       WHERE store_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [storeId, limit],
    );
    return res.rows.map(row => ({
      id: row.id,
      totalAmount: parseFloat(row.totalAmount) || 0,
      status: row.status,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async getMonthlyRevenue(storeId: string | null, months: number): Promise<{
    month: string;
    revenue: number;
  }[]> {
    const res = await query(
      `SELECT to_char(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
              COALESCE(SUM(final_amount), 0)::float8 AS revenue
       FROM orders
       WHERE status = 'confirmed'
         AND ($1::uuid IS NULL OR store_id = $1)
         AND created_at >= DATE_TRUNC('month', NOW()) - ($2::int - 1) * INTERVAL '1 month'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [storeId, months],
    );
    return res.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue) || 0,
    }));
  }
}
