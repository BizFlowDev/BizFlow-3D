import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const StoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  address: z.string().nullish(),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(255).nullish(),
  taxCode: z.string().max(50).nullish(),
  bankCode: z.string().max(20).nullish(),
  bankAccountNumber: z.string().max(50).nullish(),
  bankAccountHolder: z.string().max(255).nullish(),
  subscriptionPlan: z.string().min(1).max(50),
  subscriptionStatus: z.enum(['active', 'expired', 'trial']),
  subscriptionExpiresAt: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type StoreProps = z.infer<typeof StoreSchema>;

// ── Entity ──────────────────────────────────────────────
export class Store {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly taxCode: string | null;
  readonly bankCode: string | null;
  readonly bankAccountNumber: string | null;
  readonly bankAccountHolder: string | null;
  readonly subscriptionPlan: string;
  readonly subscriptionStatus: 'active' | 'expired' | 'trial';
  readonly subscriptionExpiresAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: StoreProps) {
    this.id = props.id;
    this.name = props.name;
    this.address = props.address ?? null;
    this.phone = props.phone ?? null;
    this.email = props.email ?? null;
    this.taxCode = props.taxCode ?? null;
    this.bankCode = props.bankCode ?? null;
    this.bankAccountNumber = props.bankAccountNumber ?? null;
    this.bankAccountHolder = props.bankAccountHolder ?? null;
    this.subscriptionPlan = props.subscriptionPlan;
    this.subscriptionStatus = props.subscriptionStatus;
    this.subscriptionExpiresAt = props.subscriptionExpiresAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Create a brand-new Store (auto-generate timestamps). */
  static create(props: Omit<StoreProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Store {
    const now = new Date();
    return Store.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruct a Store entity from a DB row. */
  static fromPersistence(data: unknown): Store {
    const result = StoreSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Store validation failed', fields);
    }
    const storeData = { ...result.data };
    if (
      storeData.subscriptionStatus === 'active' &&
      storeData.subscriptionExpiresAt &&
      new Date(storeData.subscriptionExpiresAt).getTime() < Date.now()
    ) {
      storeData.subscriptionStatus = 'expired';
    }
    return new Store(storeData);
  }

  /** Check if subscription is currently active. */
  isSubscriptionActive(): boolean {
    if (this.subscriptionStatus !== 'active') return false;
    if (this.subscriptionExpiresAt && this.subscriptionExpiresAt < new Date()) return false;
    return true;
  }
}
