import { IStoreRepository, AdminStoreRow } from '../../repositories/IStoreRepository.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export interface StoreDetailOutput extends AdminStoreRow {
  recentOrders: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
  monthlyRevenue: { month: string; revenue: number }[];
}

/**
 * Admin: store detail with recent orders and monthly revenue.
 */
export class GetStoreDetailUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(storeId: string): Promise<StoreDetailOutput> {
    const store = await this.storeRepo.findAdminById(storeId);
    if (!store) {
      throw new NotFoundError('Cửa hàng');
    }

    const [recentOrders, monthlyRevenue] = await Promise.all([
      this.orderRepo.getRecentOrdersByStore(storeId, 5),
      this.orderRepo.getMonthlyRevenue(storeId, 6),
    ]);

    return { ...store, recentOrders, monthlyRevenue };
  }
}
