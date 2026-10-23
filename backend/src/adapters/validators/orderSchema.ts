import { z } from 'zod';

/**
 * Zod schemas for order-related request body validation.
 */

const orderItemSchema = z.object({
  productId: z.string().uuid('ID sản phẩm không hợp lệ'),
  productUnitId: z.string().uuid('ID đơn vị sản phẩm không hợp lệ').nullish(),
  quantity: z.number().positive('Số lượng phải lớn hơn 0'),
  unitPrice: z.number().min(0, 'Đơn giá không được âm'),
});

// ── Create Order ──
export const createOrderSchema = z.object({
  customerId: z.string().uuid('ID khách hàng không hợp lệ').nullish(),
  orderType: z.enum(['counter', 'ai_generated']).default('counter'),
  paymentMethod: z.enum(['cash', 'stripe', 'qr_code', 'debt']).default('cash'),
  paidAmount: z.number().min(0).default(0),
  changeAmount: z.number().min(0).default(0),
  note: z.string().nullish(),
  discountAmount: z.number().min(0, 'Giảm giá không được âm').default(0),
  debtAmount: z.number().min(0, 'Số nợ không được âm').default(0),
  items: z.array(orderItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
