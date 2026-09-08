import { IOrderRepository, CategoryRevenueRow } from '../../repositories/IOrderRepository.js';

export class GetRevenueByCategoryUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(storeId: string): Promise<CategoryRevenueRow[]> {
    return this.orderRepo.getRevenueByCategory(storeId);
  }
}
