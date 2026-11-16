import type { IUnitOfWork } from '../../repositories/IUnitOfWork.js';
import { Order } from '../../entities/Order.js';
import { InventoryTransaction } from '../../entities/InventoryTransaction.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { AutoPostingUseCase } from '../accounting/AutoPostingUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';
import env from '../../../config/index.js';

export class ConfirmOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly inventoryRepo: IInventoryRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly autoPosting: AutoPostingUseCase,
    private readonly uow: IUnitOfWork,
    private readonly productRepo?: IProductRepository,
  ) {}

  async execute(orderId: string, confirmedBy: string, storeId: string): Promise<Order> {
    const { confirmedOrder, items } = await this.uow.run(async () => {
      if (!await this.uow.lock('order', orderId, storeId)) throw new NotFoundError('Đơn hàng');
      const order = await this.orderRepo.findById(orderId);
      if (!order || order.storeId !== storeId) throw new NotFoundError('Đơn hàng');
      if (order.status === 'confirmed') return { confirmedOrder: order, items: [] };
      if (!order.isDraft()) throw new ValidationError('Chỉ có thể xác nhận đơn nháp');
      if (order.finalAmount < 0 || order.debtAmount > order.finalAmount) throw new ValidationError('Số tiền và số nợ đơn hàng không hợp lệ');
      let customer = null;
      if (order.debtAmount > 0) {
        if (!order.customerId || !await this.uow.lock('customer', order.customerId, storeId)) throw new NotFoundError('Khách hàng');
        customer = await this.customerRepo.findById(order.customerId);
        if (!customer || !customer.isActive) throw new ValidationError('Khách hàng không hoạt động');
        if (customer.creditLimit > 0 && customer.debtBalance + order.debtAmount > customer.creditLimit) throw new ValidationError('Đơn hàng vượt hạn mức công nợ');
      }
      const items = await this.orderRepo.findItemsByOrderId(orderId);
      for (const productId of [...new Set(items.map(i => i.productId))].sort()) {
        if (!await this.uow.lock('product', productId, storeId)) throw new NotFoundError('Sản phẩm');
      }
      if (this.productRepo) {
        for (const item of items) {
          if (item.productUnitId && !(await this.productRepo.findUnitsByProductId(item.productId)).some(u => u.id === item.productUnitId)) throw new ValidationError('Đơn vị không thuộc sản phẩm');
        }
      }
      const confirmedOrder = await this.orderRepo.confirmOrder(orderId, confirmedBy);
      for (const item of items) {
        await this.inventoryRepo.create(InventoryTransaction.create({
          storeId, productId: item.productId, productUnitId: item.productUnitId, type: 'export', quantity: item.quantity,
          referenceType: 'order', referenceId: orderId, note: 'Xuất kho theo đơn hàng', createdBy: confirmedBy,
        }));
      }
      if (customer) await this.customerRepo.updateDebtBalance(customer.id, order.debtAmount);
      await this.autoPosting.postOrderConfirmed(confirmedOrder, items);
      return { confirmedOrder, items };
    });
    // Only committed changes are broadcast. A retry does not broadcast again.
    if (!items.length) return confirmedOrder;
    // 7. Emit real-time event: order confirmed
    appEventEmitter.emit('order:confirmed', {
      storeId: confirmedOrder.storeId,
      orderId: confirmedOrder.id,
      orderCode: confirmedOrder.id.slice(0, 8).toUpperCase(),
    });

    // 8. Check low stock for each product after export
    if (this.productRepo) {
      for (const item of items) {
        try {
          const stockLevel = await this.inventoryRepo.getStockLevel(confirmedOrder.storeId, item.productId);
          if (stockLevel.totalQuantity <= env.LOW_STOCK_THRESHOLD) {
            const product = await this.productRepo.findById(item.productId);
            appEventEmitter.emit('inventory:low_stock', {
              storeId: confirmedOrder.storeId,
              productId: item.productId,
              productName: product?.name ?? 'Unknown',
              currentStock: stockLevel.totalQuantity,
            });
          }
        } catch {
          // Non-critical: don't fail the confirm if stock check fails
        }
      }
    }

    return confirmedOrder;
  }
}
