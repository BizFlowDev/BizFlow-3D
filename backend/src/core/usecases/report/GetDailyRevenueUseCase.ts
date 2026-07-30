import { IOrderRepository, DailyRevenueRow } from '../../repositories/IOrderRepository.js';
import { ValidationError } from '../../errors/ValidationError.js';

export interface GetDailyRevenueInput {
  storeId: string;
  fromDate: Date;
  toDate: Date;
}

export class GetDailyRevenueUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(input: GetDailyRevenueInput): Promise<DailyRevenueRow[]> {
    if (input.fromDate > input.toDate) {
      throw new ValidationError('Ngày bắt đầu phải trước ngày kết thúc');
    }

    return this.orderRepo.getDailyRevenue(input.storeId, input.fromDate, input.toDate);
  }
}
