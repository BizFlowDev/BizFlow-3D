import { z } from 'zod';
import { Order } from '../../entities/Order.js';
import { OrderItem } from '../../entities/OrderItem.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
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
  paymentMethod: z.enum(['cash', 'qr_code', 'debt']).default('cash'),
  note: z.string().nullish(),
  discountAmount: z.number().min(0).default(0),
  debtAmount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  changeAmount: z.number().min(0).default(0),
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
    private readonly customerRepo?: ICustomerRepository,
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

    // 3.5. Verify customer credit limit if order incurs debt
    if (data.debtAmount > 0) {
      if (!data.customerId) {
        throw new ValidationError('Đơn hàng ghi nợ bắt buộc phải chọn khách hàng');
      }
      if (this.customerRepo) {
        const customer = await this.customerRepo.findById(data.customerId);
        if (!customer) {
          throw new NotFoundError('Khách hàng', 'Không tìm thấy thông tin khách hàng');
        }
        if (!customer.isActive) {
          throw new ValidationError(`Khách hàng "${customer.name}" đang bị tạm khóa`);
        }
        if (customer.creditLimit > 0 && (customer.debtBalance + data.debtAmount) > customer.creditLimit) {
          const excess = (customer.debtBalance + data.debtAmount) - customer.creditLimit;
          throw new ValidationError(
            `Không thể ghi nợ! Khách hàng "${customer.name}" có hạn mức nợ ${new Intl.NumberFormat('vi-VN').format(customer.creditLimit)}đ, hiện đang nợ ${new Intl.NumberFormat('vi-VN').format(customer.debtBalance)}đ. Đơn hàng nợ thêm ${new Intl.NumberFormat('vi-VN').format(data.debtAmount)}đ sẽ vượt hạn mức ${new Intl.NumberFormat('vi-VN').format(excess)}đ.`
          );
        }
      }
    }

    // 4. Create order (as draft)
    const order = Order.create({
      storeId: data.storeId,
      customerId: data.customerId,
      userId: data.userId,
      orderType: data.orderType,
      paymentMethod: data.paymentMethod,
      totalAmount,
      discountAmount: data.discountAmount,
      finalAmount,
      debtAmount: data.debtAmount,
      paidAmount: data.paidAmount,
      changeAmount: data.changeAmount,
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
    const finalOrder = (await this.orderRepo.findById(createdOrder.id)) ?? createdOrder;
    appEventEmitter.emit('order:created', {
      storeId: data.storeId,
      orderId: finalOrder.id,
      customerName: finalOrder.customerName ?? null,
      totalAmount: finalOrder.totalAmount,
    });

    return { order: finalOrder, items: createdItems };
  }
}
