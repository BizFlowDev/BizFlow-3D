import { z } from 'zod';
import { Order } from '../../entities/Order.js';
import { OrderItem } from '../../entities/OrderItem.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';

const OrderItemInput = z.object({
  productId: z.string().uuid(),
  productUnitId: z.string().uuid().nullish(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

const CreateOrderInputSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid().nullish(),
  userId: z.string().uuid().nullish(),
  orderType: z.enum(['counter', 'ai_generated']).default('counter'),
  note: z.string().nullish(),
  discountAmount: z.number().min(0).default(0),
  debtAmount: z.number().min(0).default(0),
  createdByAi: z.boolean().default(false),
  aiRawInput: z.string().nullish(),
  items: z.array(OrderItemInput).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export interface CreateOrderOutput {
  order: Order;
  items: OrderItem[];
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly productRepo: IProductRepository,
    private readonly inventoryRepo: IInventoryRepository,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    // 1. Validate input
    const parsed = CreateOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu đơn hàng không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Verify all products exist and are active
    for (const item of data.items) {
      const product = await this.productRepo.findById(item.productId);
      if (!product) {
        throw new NotFoundError('Sản phẩm', `Sản phẩm ${item.productId} không tìm thấy`);
      }
      if (!product.isActive) {
        throw new ValidationError(`Sản phẩm "${product.name}" đã ngừng kinh doanh`);
      }
    }

    // 3. Calculate totals
    const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const finalAmount = totalAmount - data.discountAmount;

    // 4. Create order (as draft)
    const order = Order.create({
      storeId: data.storeId,
      customerId: data.customerId,
      userId: data.userId,
      orderType: data.orderType,
      totalAmount,
      discountAmount: data.discountAmount,
      finalAmount,
      debtAmount: data.debtAmount,
      note: data.note,
      createdByAi: data.createdByAi,
      aiRawInput: data.aiRawInput,
    });
    const createdOrder = await this.orderRepo.create(order);

    // 5. Create order items
    const orderItems = data.items.map((item) =>
      OrderItem.create({
        orderId: createdOrder.id,
        productId: item.productId,
        productUnitId: item.productUnitId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }),
    );
    const createdItems = await this.orderRepo.createItems(orderItems);

    // 6. Emit real-time event: new order created
    appEventEmitter.emit('order:created', {
      storeId: data.storeId,
      orderId: createdOrder.id,
      customerName: null, // Customer name resolved at controller level if needed
      totalAmount: createdOrder.totalAmount,
    });

    return { order: createdOrder, items: createdItems };
  }
}
