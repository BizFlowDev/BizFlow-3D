import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const CustomerSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(255).nullish(),
  address: z.string().nullish(),
  debtBalance: z.coerce.number(),
  note: z.string().nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomerProps = z.infer<typeof CustomerSchema>;

// ── Entity ──────────────────────────────────────────────
export class Customer {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly debtBalance: number;
  readonly note: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.name = props.name;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.address = props.address ?? null;
    this.debtBalance = props.debtBalance;
    this.note = props.note ?? null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<CustomerProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'debtBalance'> & {
      id?: string;
      isActive?: boolean;
      debtBalance?: number;
    },
  ): Customer {
    const now = new Date();
    return Customer.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      isActive: props.isActive ?? true,
      debtBalance: props.debtBalance ?? 0,
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): Customer {
    const result = CustomerSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Customer validation failed', fields);
    }
    return new Customer(result.data);
  }

  /** Check if customer has outstanding debt. */
  hasDebt(): boolean {
    return this.debtBalance > 0;
  }
}
