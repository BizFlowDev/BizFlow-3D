import { Order } from '../../entities/Order.js';
import { OrderItem } from '../../entities/OrderItem.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { ValidationError } from '../../errors/ValidationError.js';
import type { MatchedOrderItem } from './ProcessNaturalLanguageOrderUseCase.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';

export interface GenerateDraftOrderInput {
  storeId: string;
  customerId?: string;
  userId?: string;
  aiRawInput: string;
  matchedItems: MatchedOrderItem[];
}

export interface GenerateDraftOrderOutput {
  order: Order;
  items: OrderItem[];
}

export class GenerateDraftOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: GenerateDraftOrderInput): Promise<GenerateDraftOrderOutput> {
    if (input.matchedItems.length === 0) {
      throw new ValidationError('Không có sản phẩm nào được nhận diện để tạo đơn hàng');
    }

    // 1. Calculate totals
    const totalAmount = input.matchedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    // 2. Create draft order
    const order = Order.create({
      storeId: input.storeId,
      customerId: input.customerId ?? null,
      userId: input.userId ?? null,
      orderType: 'ai_generated',
      totalAmount,
      finalAmount: totalAmount,
      createdByAi: true,
      aiRawInput: input.aiRawInput,
    });
    const createdOrder = await this.orderRepo.create(order);

    // 3. Create order items
    const orderItems = input.matchedItems.map((item) =>
      OrderItem.create({
        orderId: createdOrder.id,
        productId: item.productId,
        productUnitId: item.productUnitId ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }),
    );
    const createdItems = await this.orderRepo.createItems(orderItems);

    // 4. Emit real-time event: draft order created
    appEventEmitter.emit('draft:created', {
      storeId: input.storeId,
      draftOrderId: createdOrder.id,
      customerName: null, // Customer name resolved at controller level if available
      itemCount: createdItems.length,
      totalAmount: createdOrder.totalAmount,
    });

    return { order: createdOrder, items: createdItems };
  }
}
