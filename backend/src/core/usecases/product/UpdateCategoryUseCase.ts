import { ProductCategory } from '../../entities/ProductCategory.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

export interface UpdateCategoryInput {
  id: string;
  storeId: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export class UpdateCategoryUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: UpdateCategoryInput): Promise<ProductCategory> {
    const existingCategory = await this.productRepo.findCategoryById(input.id);
    if (!existingCategory || existingCategory.storeId !== input.storeId) {
      throw new NotFoundError('Danh mục', 'Danh mục không tồn tại trong cửa hàng');
    }

    let trimmedName: string | undefined;
    if (input.name !== undefined) {
      trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new ValidationError('Tên danh mục không được để trống');
      }

      if (trimmedName.toLowerCase() !== existingCategory.name.toLowerCase()) {
        const storeCategories = await this.productRepo.findCategoriesByStoreId(input.storeId);
        const isDuplicate = storeCategories.some(
          (c) => c.id !== input.id && c.name.trim().toLowerCase() === trimmedName!.toLowerCase()
        );

        if (isDuplicate) {
          throw new ConflictError(`Danh mục "${trimmedName}" đã tồn tại trong cửa hàng`);
        }
      }
    }

    return await this.productRepo.updateCategory(input.id, {
      name: trimmedName,
      description: input.description !== undefined ? input.description : undefined,
      isActive: input.isActive,
    });
  }
}
