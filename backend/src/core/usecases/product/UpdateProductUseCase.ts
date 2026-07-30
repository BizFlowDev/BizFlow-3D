import { Product } from '../../entities/Product.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ConflictError } from '../../errors/ConflictError.js';

export interface UpdateProductInput {
  productId: string;
  storeId: string;
  categoryId?: string | null;
  code?: string;
  name?: string;
  imageUrl?: string | null;
  description?: string | null;
}

export class UpdateProductUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: UpdateProductInput): Promise<Product> {
    // 1. Find existing product
    const existing = await this.productRepo.findById(input.productId);
    if (!existing) {
      throw new NotFoundError('Sản phẩm');
    }

    // 2. If code is changing, check uniqueness
    if (input.code && input.code !== existing.code) {
      const duplicate = await this.productRepo.findByCode(input.storeId, input.code);
      if (duplicate && duplicate.id !== input.productId) {
        throw new ConflictError(`Mã sản phẩm "${input.code}" đã tồn tại trong cửa hàng`);
      }
    }

    // 3. Build update data
    const updateData: {
      categoryId?: string | null;
      code?: string;
      name?: string;
      imageUrl?: string | null;
      description?: string | null;
    } = {};
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.description !== undefined) updateData.description = input.description;

    return this.productRepo.update(input.productId, updateData);
  }
}
