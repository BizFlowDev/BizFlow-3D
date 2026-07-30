import { IOrderRepository, TopProductRow } from '../../repositories/IOrderRepository.js';

export class GetTopProductsUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(storeId: string, limit: number = 10): Promise<TopProductRow[]> {
    return this.orderRepo.getTopProducts(storeId, Math.min(limit, 50));
  }
}
