import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  productUnitId: z.string().uuid().nullish(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  totalPrice: z.coerce.number().min(0),
  createdAt: z.coerce.date(),
});

export type OrderItemProps = z.infer<typeof OrderItemSchema>;

// ── Entity ──────────────────────────────────────────────
export class OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string;
  readonly productUnitId: string | null;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
  readonly createdAt: Date;

  private constructor(props: OrderItemProps) {
    this.id = props.id;
    this.orderId = props.orderId;
    this.productId = props.productId;
    this.productUnitId = props.productUnitId ?? null;
    this.quantity = props.quantity;
    this.unitPrice = props.unitPrice;
    this.totalPrice = props.totalPrice;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<OrderItemProps, 'id' | 'createdAt' | 'totalPrice'> & {
      id?: string;
      totalPrice?: number;
    },
  ): OrderItem {
    return OrderItem.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      totalPrice: props.totalPrice ?? props.quantity * props.unitPrice,
      ...props,
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): OrderItem {
    const result = OrderItemSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('OrderItem validation failed', fields);
    }
    return new OrderItem(result.data);
  }
}
