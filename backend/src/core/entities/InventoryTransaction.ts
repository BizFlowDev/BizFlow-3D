import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const InventoryTransactionSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  productUnitId: z.string().uuid().nullish(),
  type: z.enum(['import', 'export', 'adjustment']),
  quantity: z.number(),
  referenceType: z.enum(['order', 'purchase', 'adjustment']).nullish(),
  referenceId: z.string().uuid().nullish(),
  note: z.string().nullish(),
  createdBy: z.string().uuid().nullish(),
  createdAt: z.coerce.date(),
});

export type InventoryTransactionProps = z.infer<typeof InventoryTransactionSchema>;

// ── Entity ──────────────────────────────────────────────
export class InventoryTransaction {
  readonly id: string;
  readonly storeId: string;
  readonly productId: string;
  readonly productUnitId: string | null;
  readonly type: 'import' | 'export' | 'adjustment';
  readonly quantity: number;
  readonly referenceType: 'order' | 'purchase' | 'adjustment' | null;
  readonly referenceId: string | null;
  readonly note: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: InventoryTransactionProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.productId = props.productId;
    this.productUnitId = props.productUnitId ?? null;
    this.type = props.type;
    this.quantity = props.quantity;
    this.referenceType = props.referenceType ?? null;
    this.referenceId = props.referenceId ?? null;
    this.note = props.note ?? null;
    this.createdBy = props.createdBy ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<InventoryTransactionProps, 'id' | 'createdAt'> & { id?: string },
  ): InventoryTransaction {
    return InventoryTransaction.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): InventoryTransaction {
    const result = InventoryTransactionSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('InventoryTransaction validation failed', fields);
    }
    return new InventoryTransaction(result.data);
  }

  /** Returns true if this transaction adds stock. */
  isInbound(): boolean {
    return this.type === 'import';
  }

  /** Returns true if this transaction removes stock. */
  isOutbound(): boolean {
    return this.type === 'export';
  }
}
