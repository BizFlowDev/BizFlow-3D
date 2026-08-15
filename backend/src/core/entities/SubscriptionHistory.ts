import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────────
export const SubscriptionHistorySchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  storeName: z.string().nullish(),
  oldPlan: z.string().nullish(),
  newPlan: z.string(),
  oldStatus: z.string().nullish(),
  newStatus: z.string().nullish(),
  changedBy: z.string().uuid().nullish(),
  changedByName: z.string().nullish(),
  note: z.string().nullish(),
  createdAt: z.coerce.date(),
});

export type SubscriptionHistoryProps = z.infer<typeof SubscriptionHistorySchema>;

// ── Entity ──────────────────────────────────────────────────
export class SubscriptionHistory {
  readonly id: string;
  readonly storeId: string;
  readonly storeName: string | null;
  readonly oldPlan: string | null;
  readonly newPlan: string;
  readonly oldStatus: string | null;
  readonly newStatus: string | null;
  readonly changedBy: string | null;
  readonly changedByName: string | null;
  readonly note: string | null;
  readonly createdAt: Date;

  private constructor(props: SubscriptionHistoryProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.storeName = props.storeName ?? null;
    this.oldPlan = props.oldPlan ?? null;
    this.newPlan = props.newPlan;
    this.oldStatus = props.oldStatus ?? null;
    this.newStatus = props.newStatus ?? null;
    this.changedBy = props.changedBy ?? null;
    this.changedByName = props.changedByName ?? null;
    this.note = props.note ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<SubscriptionHistoryProps, 'id' | 'createdAt'> & { id?: string },
  ): SubscriptionHistory {
    return SubscriptionHistory.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): SubscriptionHistory {
    const result = SubscriptionHistorySchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('SubscriptionHistory validation failed', fields);
    }
    return new SubscriptionHistory(result.data);
  }
}
