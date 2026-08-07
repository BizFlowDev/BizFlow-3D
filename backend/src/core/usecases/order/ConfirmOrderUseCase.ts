import { Order } from '../../entities/Order.js';
import { InventoryTransaction } from '../../entities/InventoryTransaction.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { AutoPostingUseCase } from '../accounting/AutoPostingUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

export class ConfirmOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly autoPosting: AutoPostingUseCase,
  ) {}

  async execute(orderId: string, confirmedBy: string): Promise<Order> {
    // 1. Find order
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Đơn hàng');
    }

    // 2. Validate order is in draft status
    if (!order.isDraft()) {
      throw new ValidationError(`Đơn hàng đang ở trạng thái "${order.status}", không thể xác nhận`);
    }

    // 3. Confirm order
    const confirmedOrder = await this.orderRepo.confirmOrder(orderId, confirmedBy);

    // 4. Deduct inventory for each item
    const items = await this.orderRepo.findItemsByOrderId(orderId);
    for (const item of items) {
      const transaction = InventoryTransaction.create({
        storeId: order.storeId,
        productId: item.productId,
        productUnitId: item.productUnitId,
        type: 'export',
        quantity: item.quantity,
        referenceType: 'order',
        referenceId: orderId,
        note: `Xuất kho theo đơn hàng`,
        createdBy: confirmedBy,
      });
      await this.inventoryRepo.create(transaction);
    }

    // 5. Update customer debt if applicable
    if (order.customerId && order.debtAmount > 0) {
      const customer = await this.customerRepo.findById(order.customerId);
      if (customer) {
        await this.customerRepo.updateDebtBalance(
          order.customerId,
          customer.debtBalance + order.debtAmount,
        );
      }
    }

    // 6. Hạch toán tự động: ghi nhận doanh thu + giá vốn + phải thu
    const postedItems = await this.orderRepo.findItemsByOrderId(orderId);
    await this.autoPosting.postOrderConfirmed(confirmedOrder, postedItems);

    return confirmedOrder;
  }
}
