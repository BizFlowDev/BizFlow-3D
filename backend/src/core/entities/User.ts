import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const UserSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid().nullish(),
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(20).nullish(),
  passwordHash: z.string().min(1),
  role: z.enum(['owner', 'employee', 'admin']),
  isActive: z.boolean(),
  lastLoginAt: z.coerce.date().nullish(),
  deletedAt: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type UserProps = z.infer<typeof UserSchema>;

// ── Entity ──────────────────────────────────────────────
export class User {
  readonly id: string;
  readonly storeId: string | null;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly passwordHash: string;
  readonly role: 'owner' | 'employee' | 'admin';
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.storeId = props.storeId ?? null;
    this.fullName = props.fullName;
    this.email = props.email;
    this.phone = props.phone ?? null;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.isActive = props.isActive;
    this.lastLoginAt = props.lastLoginAt ?? null;
    this.deletedAt = props.deletedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Create a brand-new User. Password must be pre-hashed. */
  static create(
    props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'lastLoginAt' | 'deletedAt'> & {
      id?: string;
      isActive?: boolean;
    },
  ): User {
    const now = new Date();
    return User.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      isActive: props.isActive ?? true,
      lastLoginAt: null,
      deletedAt: null,
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Reconstruct a User entity from a DB row. */
  static fromPersistence(data: unknown): User {
    const result = UserSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('User validation failed', fields);
    }
    return new User(result.data);
  }

  /** Check if user is store owner. */
  isOwner(): boolean {
    return this.role === 'owner';
  }

  /** Check if user is system admin. */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /** Check if user is soft deleted. */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /** Check if user belongs to a specific store. */
  belongsToStore(storeId: string): boolean {
    return this.storeId === storeId;
  }
}
