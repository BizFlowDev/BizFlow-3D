import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────────
export const SubscriptionOrderStatusSchema = z.enum([
  'pending',
  'completed',
  'failed',
  'expired',
  'cancelled',
]);
export type SubscriptionOrderStatus = z.infer<typeof SubscriptionOrderStatusSchema>;

export const SubscriptionOrderSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  planId: z.string().uuid().nullish(),
  planSlug: z.string(),
  durationMonths: z.number().int().min(1).default(1),
  amount: z.coerce.number().min(0),
  currency: z.string().default('vnd'),
  paymentMethod: z.string().default('stripe'),
  status: SubscriptionOrderStatusSchema.default('pending'),
  stripeSessionId: z.string().nullish(),
  stripePaymentIntentId: z.string().nullish(),
  checkoutUrl: z.string().nullish(),
  qrCodeUrl: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).default({}),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SubscriptionOrderProps = z.infer<typeof SubscriptionOrderSchema>;

// ── Entity ──────────────────────────────────────────────────
export class SubscriptionOrder {
  readonly id: string;
  readonly storeId: string;
  readonly planId: string | null;
  readonly planSlug: string;
  readonly durationMonths: number;
  readonly amount: number;
  readonly currency: string;
  readonly paymentMethod: string;
  readonly status: SubscriptionOrderStatus;
  readonly stripeSessionId: string | null;
  readonly stripePaymentIntentId: string | null;
  readonly checkoutUrl: string | null;
  readonly qrCodeUrl: string | null;
  readonly metadata: Record<string, any>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubscriptionOrderProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.planId = props.planId ?? null;
    this.planSlug = props.planSlug;
    this.durationMonths = props.durationMonths;
    this.amount = props.amount;
    this.currency = props.currency;
    this.paymentMethod = props.paymentMethod;
    this.status = props.status;
    this.stripeSessionId = props.stripeSessionId ?? null;
    this.stripePaymentIntentId = props.stripePaymentIntentId ?? null;
    this.checkoutUrl = props.checkoutUrl ?? null;
    this.qrCodeUrl = props.qrCodeUrl ?? null;
    this.metadata = props.metadata ?? {};
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<SubscriptionOrderProps, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
      id?: string;
      status?: SubscriptionOrderStatus;
    },
  ): SubscriptionOrder {
    const now = new Date();
    return SubscriptionOrder.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      status: props.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): SubscriptionOrder {
    const result = SubscriptionOrderSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('SubscriptionOrder validation failed', fields);
    }
    return new SubscriptionOrder(result.data);
  }
}
