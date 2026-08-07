import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const AccountingEntrySchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  entryDate: z.coerce.date(),
  accountCode: z.string().min(1),
  accountName: z.string().min(1),
  debitAmount: z.coerce.number().min(0),
  creditAmount: z.coerce.number().min(0),
  referenceType: z.enum(['order', 'inventory_import', 'debt_payment']),
  referenceId: z.string(),
  description: z.string().nullish(),
  createdAt: z.coerce.date(),
});

export type AccountingEntryProps = z.infer<typeof AccountingEntrySchema>;

// ── Entity ──────────────────────────────────────────────
export class AccountingEntry {
  readonly id: string;
  readonly storeId: string;
  readonly entryDate: Date;
  readonly accountCode: string;
  readonly accountName: string;
  readonly debitAmount: number;
  readonly creditAmount: number;
  readonly referenceType: 'order' | 'inventory_import' | 'debt_payment';
  readonly referenceId: string;
  readonly description: string | null;
  readonly createdAt: Date;

  private constructor(props: AccountingEntryProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.entryDate = props.entryDate;
    this.accountCode = props.accountCode;
    this.accountName = props.accountName;
    this.debitAmount = props.debitAmount;
    this.creditAmount = props.creditAmount;
    this.referenceType = props.referenceType;
    this.referenceId = props.referenceId;
    this.description = props.description ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<AccountingEntryProps, 'id' | 'createdAt'> & {
      id?: string;
      createdAt?: Date;
    },
  ): AccountingEntry {
    const now = new Date();
    return AccountingEntry.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: props.createdAt ?? now,
    });
  }

  static fromPersistence(data: unknown): AccountingEntry {
    const result = AccountingEntrySchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('AccountingEntry validation failed', fields);
    }
    return new AccountingEntry(result.data);
  }
}