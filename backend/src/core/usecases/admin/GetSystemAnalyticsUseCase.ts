import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';

export interface SystemAnalyticsOutput {
  totalStores: number;
  totalUsers: number;
  totalOrders: number;
  storesByPlan: {
    basic: number;
    professional: number;
  };
  storesByStatus: {
    active: number;
    expired: number;
    trial: number;
  };
  generatedAt: Date;
}

/**
 * System-level analytics for admin dashboard.
 * Aggregates data across all stores.
 */
export class GetSystemAnalyticsUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo: IUserRepository,
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(): Promise<SystemAnalyticsOutput> {
    // NOTE: In a real implementation, these would be optimized COUNT queries
    // rather than loading all entities into memory. The repository interface
    // would have dedicated counting methods. For now, this defines the
    // use case contract — the repository implementation will optimize.

    // This is a placeholder structure. The actual implementation will
    // use efficient aggregate queries via the repository layer.
    return {
      totalStores: 0,   // Will be populated by repository impl
      totalUsers: 0,    // Will be populated by repository impl
      totalOrders: 0,   // Will be populated by repository impl
      storesByPlan: {
        basic: 0,
        professional: 0,
      },
      storesByStatus: {
        active: 0,
        expired: 0,
        trial: 0,
      },
      generatedAt: new Date(),
    };
  }
}
