import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────────
export const SubscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  description: z.string().nullish(),
  price: z.number().min(0),
  features: z.array(z.string()),
  maxEmployees: z.number().int().min(1),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  colorFrom: z.string().nullish(),
  colorTo: z.string().nullish(),
  icon: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SubscriptionPlanProps = z.infer<typeof SubscriptionPlanSchema>;

// ── Entity ──────────────────────────────────────────────────
export class SubscriptionPlan {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly price: number;
  readonly features: string[];
  readonly maxEmployees: number;
  readonly isActive: boolean;
  readonly sortOrder: number;
  readonly colorFrom: string | null;
  readonly colorTo: string | null;
  readonly icon: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubscriptionPlanProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.description = props.description ?? null;
    this.price = props.price;
    this.features = props.features;
    this.maxEmployees = props.maxEmployees;
    this.isActive = props.isActive;
    this.sortOrder = props.sortOrder;
    this.colorFrom = props.colorFrom ?? null;
    this.colorTo = props.colorTo ?? null;
    this.icon = props.icon ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<SubscriptionPlanProps, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): SubscriptionPlan {
    const now = new Date();
    return SubscriptionPlan.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): SubscriptionPlan {
    const result = SubscriptionPlanSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('SubscriptionPlan validation failed', fields);
    }
    return new SubscriptionPlan(result.data);
  }
}
