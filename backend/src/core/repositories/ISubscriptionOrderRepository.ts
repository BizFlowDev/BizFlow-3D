import { SubscriptionOrder, SubscriptionOrderStatus } from '../entities/SubscriptionOrder.js';

export interface SubscriptionOrderFilter {
  storeId?: string;
  status?: SubscriptionOrderStatus;
  page?: number;
  limit?: number;
}

export interface SubscriptionOrderListResult {
  items: SubscriptionOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ISubscriptionOrderRepository {
  findById(id: string): Promise<SubscriptionOrder | null>;
  findByStripeSessionId(sessionId: string): Promise<SubscriptionOrder | null>;
  findLatestPendingByStoreId(storeId: string): Promise<SubscriptionOrder | null>;
  findAll(filter?: SubscriptionOrderFilter): Promise<SubscriptionOrderListResult>;
  create(order: SubscriptionOrder): Promise<SubscriptionOrder>;
  updateStatus(
    id: string,
    status: SubscriptionOrderStatus,
    extra?: {
      stripePaymentIntentId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<SubscriptionOrder | null>;
}
