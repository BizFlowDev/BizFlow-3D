import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const DebtPaymentSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderId: z.string().uuid().nullish(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(['cash', 'transfer']),
  note: z.string().nullish(),
  createdBy: z.string().uuid().nullish(),
  createdAt: z.coerce.date(),
});

export type DebtPaymentProps = z.infer<typeof DebtPaymentSchema>;

// ── Entity ──────────────────────────────────────────────
export class DebtPayment {
  readonly id: string;
  readonly storeId: string;
  readonly customerId: string;
  readonly orderId: string | null;
  readonly amount: number;
  readonly paymentMethod: 'cash' | 'transfer';
  readonly note: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: DebtPaymentProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.customerId = props.customerId;
    this.orderId = props.orderId ?? null;
    this.amount = props.amount;
    this.paymentMethod = props.paymentMethod;
    this.note = props.note ?? null;
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<DebtPaymentProps, 'id' | 'createdAt'> & { id?: string },
  ): DebtPayment {
    return DebtPayment.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): DebtPayment {
    const result = DebtPaymentSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('DebtPayment validation failed', fields);
    }
    return new DebtPayment(result.data);
  }
}
