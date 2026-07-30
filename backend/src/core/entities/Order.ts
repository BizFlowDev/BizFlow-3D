import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const OrderSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  customerId: z.string().uuid().nullish(),
  userId: z.string().uuid().nullish(),
  orderType: z.enum(['counter', 'ai_generated']),
  status: z.enum(['draft', 'confirmed', 'cancelled']),
  totalAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  finalAmount: z.number().min(0),
  debtAmount: z.number().min(0),
  note: z.string().nullish(),
  createdByAi: z.boolean(),
  aiRawInput: z.string().nullish(),
  confirmedBy: z.string().uuid().nullish(),
  confirmedAt: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrderProps = z.infer<typeof OrderSchema>;

// ── Entity ──────────────────────────────────────────────
export class Order {
  readonly id: string;
  readonly storeId: string;
  readonly customerId: string | null;
  readonly userId: string | null;
  readonly orderType: 'counter' | 'ai_generated';
  readonly status: 'draft' | 'confirmed' | 'cancelled';
  readonly totalAmount: number;
  readonly discountAmount: number;
  readonly finalAmount: number;
  readonly debtAmount: number;
  readonly note: string | null;
  readonly createdByAi: boolean;
  readonly aiRawInput: string | null;
  readonly confirmedBy: string | null;
  readonly confirmedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: OrderProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.customerId = props.customerId ?? null;
    this.userId = props.userId ?? null;
    this.orderType = props.orderType;
    this.status = props.status;
    this.totalAmount = props.totalAmount;
    this.discountAmount = props.discountAmount;
    this.finalAmount = props.finalAmount;
    this.debtAmount = props.debtAmount;
    this.note = props.note ?? null;
    this.createdByAi = props.createdByAi;
    this.aiRawInput = props.aiRawInput ?? null;
    this.confirmedBy = props.confirmedBy ?? null;
    this.confirmedAt = props.confirmedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<
      OrderProps,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'totalAmount' | 'discountAmount' | 'finalAmount' | 'debtAmount' | 'createdByAi' | 'confirmedBy' | 'confirmedAt'
    > & {
      id?: string;
      status?: 'draft' | 'confirmed' | 'cancelled';
      totalAmount?: number;
      discountAmount?: number;
      finalAmount?: number;
      debtAmount?: number;
      createdByAi?: boolean;
    },
  ): Order {
    const now = new Date();
    return Order.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      status: props.status ?? 'draft',
      totalAmount: props.totalAmount ?? 0,
      discountAmount: props.discountAmount ?? 0,
      finalAmount: props.finalAmount ?? 0,
      debtAmount: props.debtAmount ?? 0,
      createdByAi: props.createdByAi ?? false,
      confirmedBy: null,
      confirmedAt: null,
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): Order {
    const result = OrderSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Order validation failed', fields);
    }
    return new Order(result.data);
  }

  /** Check if the order can still be modified. */
  isDraft(): boolean {
    return this.status === 'draft';
  }

  /** Check if the order has been confirmed. */
  isConfirmed(): boolean {
    return this.status === 'confirmed';
  }
}
