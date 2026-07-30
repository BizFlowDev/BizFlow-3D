import { z } from 'zod';
import { Product } from '../../entities/Product.js';
import { ProductUnit } from '../../entities/ProductUnit.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const UnitInput = z.object({
  unitName: z.string().min(1).max(50),
  conversionFactor: z.number().positive(),
  price: z.number().min(0),
  isDefault: z.boolean(),
});

const CreateProductInputSchema = z.object({
  storeId: z.string().uuid(),
  categoryId: z.string().uuid().nullish(),
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  imageUrl: z.string().nullish(),
  description: z.string().nullish(),
  units: z.array(UnitInput).min(1),
});

export type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

export interface CreateProductOutput {
  product: Product;
  units: ProductUnit[];
}

export class CreateProductUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<CreateProductOutput> {
    // 1. Validate input
    const parsed = CreateProductInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu sản phẩm không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Ensure exactly one default unit
    const defaultUnits = data.units.filter((u) => u.isDefault);
    if (defaultUnits.length !== 1) {
      throw new ValidationError('Phải có đúng 1 đơn vị mặc định');
    }

    // 3. Check unique product code within store
    const existing = await this.productRepo.findByCode(data.storeId, data.code);
    if (existing) {
      throw new ConflictError(`Mã sản phẩm "${data.code}" đã tồn tại trong cửa hàng`);
    }

    // 4. Create product
    const hasMultipleUnits = data.units.length > 1;
    const product = Product.create({
      storeId: data.storeId,
      categoryId: data.categoryId,
      code: data.code,
      name: data.name,
      imageUrl: data.imageUrl,
      description: data.description,
      hasMultipleUnits,
    });
    const createdProduct = await this.productRepo.create(product);

    // 5. Create product units
    const units: ProductUnit[] = [];
    for (const unitInput of data.units) {
      const unit = ProductUnit.create({
        productId: createdProduct.id,
        unitName: unitInput.unitName,
        conversionFactor: unitInput.conversionFactor,
        price: unitInput.price,
        isDefault: unitInput.isDefault,
      });
      const createdUnit = await this.productRepo.createUnit(unit);
      units.push(createdUnit);
    }

    return { product: createdProduct, units };
  }
}
