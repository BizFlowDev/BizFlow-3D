import { Store } from '../entities/Store.js';

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
      subscriptionPlan: 'basic' | 'professional';
      subscriptionStatus: 'active' | 'expired' | 'trial';
      subscriptionExpiresAt: Date | null;
    },
  ): Promise<Store>;
}
