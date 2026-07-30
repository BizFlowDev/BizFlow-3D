import { Order } from '../../entities/Order.js';
import { OrderItem } from '../../entities/OrderItem.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export interface OrderDetailOutput {
  order: Order;
  items: OrderItem[];
}

export class GetOrderDetailUseCase {
  constructor(private readonly orderRepo: IOrderRepository) {}

  async execute(orderId: string): Promise<OrderDetailOutput> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Đơn hàng');
    }

    const items = await this.orderRepo.findItemsByOrderId(orderId);

    return { order, items };
  }
}
