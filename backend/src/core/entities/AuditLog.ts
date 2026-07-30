import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().nullish(),
  userId: z.string().uuid().nullish(),
  action: z.enum(['create', 'update', 'delete']),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  oldValues: z.record(z.string(), z.unknown()).nullish(),
  newValues: z.record(z.string(), z.unknown()).nullish(),
  ipAddress: z.string().max(45).nullish(),
  createdAt: z.coerce.date(),
});

export type AuditLogProps = z.infer<typeof AuditLogSchema>;

// ── Entity ──────────────────────────────────────────────
export class AuditLog {
  readonly id: string;
  readonly storeId: string | null;
  readonly userId: string | null;
  readonly action: 'create' | 'update' | 'delete';
  readonly entityType: string;
  readonly entityId: string;
  readonly oldValues: Record<string, unknown> | null;
  readonly newValues: Record<string, unknown> | null;
  readonly ipAddress: string | null;
  readonly createdAt: Date;

  private constructor(props: AuditLogProps) {
    this.id = props.id;
    this.storeId = props.storeId ?? null;
    this.userId = props.userId ?? null;
    this.action = props.action;
    this.entityType = props.entityType;
    this.entityId = props.entityId;
    this.oldValues = props.oldValues ?? null;
    this.newValues = props.newValues ?? null;
    this.ipAddress = props.ipAddress ?? null;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<AuditLogProps, 'id' | 'createdAt'> & { id?: string },
  ): AuditLog {
    return AuditLog.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): AuditLog {
    const result = AuditLogSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('AuditLog validation failed', fields);
    }
    return new AuditLog(result.data);
  }
}
