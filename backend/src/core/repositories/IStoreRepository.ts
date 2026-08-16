import { Store } from '../entities/Store.js';

// ── Admin list/detail row types ───────────────────────────────────────────────

export interface AdminStoreRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxCode: string | null;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'expired' | 'trial';
  subscriptionExpiresAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  employeeCount: number;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStoreFilter {
  search?: string;
  status?: 'active' | 'expired' | 'trial';
  plan?: string;
  page?: number;
  limit?: number;
}

export interface AdminStoreResult {
  data: AdminStoreRow[];
  total: number;
  page: number;
  limit: number;
}

export interface TopStoreRow {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  plan: string;
}

export interface IStoreRepository {
  findById(id: string): Promise<Store | null>;
  findByEmail(email: string): Promise<Store | null>;
  create(store: Store): Promise<Store>;
  update(id: string, data: Partial<Pick<Store, 'name' | 'address' | 'phone' | 'email' | 'taxCode'>>): Promise<Store>;
  delete(id: string): Promise<void>;

  /** Update subscription plan and status for a store. */
  updateSubscription(
    id: string,
    data: {
      subscriptionPlan: string;
      subscriptionStatus: 'active' | 'expired' | 'trial';
      subscriptionExpiresAt: Date | null;
    },
  ): Promise<Store>;

  // ── Admin aggregate queries ──

  /** List all stores with owner info + order/user aggregates, paginated. */
  searchAdmin(filter: AdminStoreFilter): Promise<AdminStoreResult>;

  /** Single store with owner info + order/user aggregates. */
  findAdminById(id: string): Promise<AdminStoreRow | null>;

  /** Total number of stores on the platform. */
  countAll(): Promise<number>;

  /** Number of stores with an active subscription. */
  countActiveSubscriptions(): Promise<number>;

  /** Sum of monthly subscription prices across active stores. */
  getMrr(basicPrice: number, professionalPrice: number): Promise<number>;

  /** New store registrations grouped by month (last `months` months). */
  getNewRegistrations(months: number): Promise<{ date: string; count: number }[]>;

  /** Top stores by confirmed-order revenue. */
  getTopStoresByRevenue(limit: number): Promise<TopStoreRow[]>;
}
