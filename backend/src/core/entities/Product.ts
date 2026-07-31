import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';
import { ProductUnit } from './ProductUnit.js';

// ── Zod Schema ──────────────────────────────────────────
export const ProductSchema = z.object({
  id: z.string().uuid(),
  storeId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  imageUrl: z.string().nullish(),
  description: z.string().nullish(),
  hasMultipleUnits: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ProductProps = z.infer<typeof ProductSchema>;

// ── Entity ──────────────────────────────────────────────
export class Product {
  readonly id: string;
  readonly storeId: string;
  readonly categoryId: string | null;
  readonly code: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly description: string | null;
  readonly hasMultipleUnits: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  units?: ProductUnit[];

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.categoryId = props.categoryId ?? null;
    this.code = props.code;
    this.name = props.name;
    this.imageUrl = props.imageUrl ?? null;
    this.description = props.description ?? null;
    this.hasMultipleUnits = props.hasMultipleUnits;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    props: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt' | 'isActive' | 'hasMultipleUnits'> & {
      id?: string;
      isActive?: boolean;
      hasMultipleUnits?: boolean;
    },
  ): Product {
    const now = new Date();
    return Product.fromPersistence({
      id: props.id ?? crypto.randomUUID(),
      isActive: props.isActive ?? true,
      hasMultipleUnits: props.hasMultipleUnits ?? false,
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(data: unknown): Product {
    const result = ProductSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Product validation failed', fields);
    }
    return new Product(result.data);
  }
}
