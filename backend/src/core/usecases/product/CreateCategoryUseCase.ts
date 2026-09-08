import { ProductCategory } from '../../entities/ProductCategory.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

export interface CreateCategoryInput {
  storeId: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export class CreateCategoryUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: CreateCategoryInput): Promise<ProductCategory> {
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw new ValidationError('Tên danh mục không được để trống');
    }

    // Kiểm tra trùng tên danh mục trong cùng cửa hàng
    const existing = await this.productRepo.findCategoriesByStoreId(input.storeId);
    const isDuplicate = existing.some(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      throw new ConflictError(`Danh mục "${trimmedName}" đã tồn tại trong cửa hàng`);
    }

    const category = ProductCategory.create({
      storeId: input.storeId,
      name: trimmedName,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    });

    return await this.productRepo.createCategory(category);
  }
}
