import { z } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

// ── Zod Schema ──────────────────────────────────────────
export const ProductUnitSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  unitName: z.string().min(1).max(50),
  conversionFactor: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
});

export type ProductUnitProps = z.infer<typeof ProductUnitSchema>;

// ── Entity ──────────────────────────────────────────────
export class ProductUnit {
  readonly id: string;
  readonly productId: string;
  readonly unitName: string;
  readonly conversionFactor: number;
  readonly price: number;
  readonly isDefault: boolean;
  readonly createdAt: Date;

  private constructor(props: ProductUnitProps) {
    this.id = props.id;
    this.productId = props.productId;
    this.unitName = props.unitName;
    this.conversionFactor = props.conversionFactor;
    this.price = props.price;
    this.isDefault = props.isDefault;
    this.createdAt = props.createdAt;
  }

  static create(
    props: Omit<ProductUnitProps, 'id' | 'createdAt'> & {
      id?: string;
    },
  ): ProductUnit {
    return ProductUnit.fromPersistence({
      ...props,
      id: props.id ?? crypto.randomUUID(),
      createdAt: new Date(),
    });
  }

  static fromPersistence(data: unknown): ProductUnit {
    const result = ProductUnitSchema.safeParse(data);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('ProductUnit validation failed', fields);
    }
    return new ProductUnit(result.data);
  }

  /** Convert a quantity from this unit to the base unit. */
  toBaseQuantity(quantity: number): number {
    return quantity * this.conversionFactor;
  }
}
