import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const ProductCategorySchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductCategoryProps = z.infer<typeof ProductCategorySchema>;

// ── Entity ──────────────────────────────────────────────
export class ProductCategory {
  readonly id: string;
  readonly storeId: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ProductCategoryProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.name = props.name;
    this.description = props.description ?? null;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<ProductCategoryProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> & {
      id?: string;
      isActive?: boolean;
    },
  ): ProductCategory {
    const now = new Date();
    return ProductCategory.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      isActive: props.isActive ?? true,
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): ProductCategory {
    const result = ProductCategorySchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('ProductCategory validation failed', fields);
    }
    return new ProductCategory(result.data);
  }
}
