import { Order } from '../entities/Order.js';
import { OrderItem } from '../entities/OrderItem.js';

export interface OrderFilter {
  storeId: string;
  status?: 'draft' | 'confirmed' | 'cancelled';
  customerId?: string;
  orderType?: 'counter' | 'ai_generated';
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DailyRevenueRow {
  date: string;
  totalRevenue: number;
  orderCount: number;
}

export interface TopProductRow {
  productId: string;
  code: string;
  name: string;
  categoryName: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
}

export interface IOrderRepository {
  // ── Order CRUD ──
  findById(id: string): Promise<Order | null>;
  findByStoreId(storeId: string): Promise<Order[]>;
  findByCustomerId(customerId: string): Promise<Order[]>;
  create(order: Order): Promise<Order>;
  update(
    id: string,
    data: Partial<Pick<Order, 'status' | 'totalAmount' | 'discountAmount' | 'finalAmount' | 'debtAmount' | 'paymentMethod' | 'paidAmount' | 'changeAmount' | 'note' | 'confirmedBy' | 'confirmedAt'>>,
  ): Promise<Order>;

  /** Confirm an order — sets status, confirmedBy, confirmedAt. */
  confirmOrder(id: string, confirmedBy: string): Promise<Order>;

  /** Search orders with pagination & filters. */
  search(filter: OrderFilter): Promise<PaginatedResult<Order>>;

  // ── Order Items ──
  findItemsByOrderId(orderId: string): Promise<OrderItem[]>;
  createItem(item: OrderItem): Promise<OrderItem>;
  createItems(items: OrderItem[]): Promise<OrderItem[]>;
  deleteItemsByOrderId(orderId: string): Promise<void>;

  // ── Report queries (backed by DB views) ──
  getDailyRevenue(storeId: string, fromDate: Date, toDate: Date): Promise<DailyRevenueRow[]>;
  getTopProducts(storeId: string, limit: number): Promise<TopProductRow[]>;

  // ── Admin queries ──
  /** Most recent orders for a store (lightweight, no items). */
  getRecentOrdersByStore(storeId: string, limit: number): Promise<{
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[]>;

  /** Confirmed-order revenue grouped by month. `storeId` null = all stores. */
  getMonthlyRevenue(storeId: string | null, months: number): Promise<{
    month: string;
    revenue: number;
  }[]>;
}
