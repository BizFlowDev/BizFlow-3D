import { Order } from '../../entities/Order.js';
import { IOrderRepository, OrderFilter, PaginatedResult } from '../../repositories/IOrderRepository.js';

export interface ListOrdersInput {
  storeId: string;
  status?: 'draft' | 'confirmed' | 'cancelled';
  customerId?: string;
  orderType?: 'counter' | 'ai_generated';
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export class ListOrdersUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(input: ListOrdersInput): Promise<PaginatedResult<Order>> {
    const filter: OrderFilter = {
      storeId: input.storeId,
      status: input.status,
      customerId: input.customerId,
      orderType: input.orderType,
      fromDate: input.fromDate,
      toDate: input.toDate,
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
    };

    return this.orderRepo.search(filter);
  }
}
