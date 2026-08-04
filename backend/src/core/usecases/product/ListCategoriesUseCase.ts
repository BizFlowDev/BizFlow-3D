import { ProductCategory } from '../../entities/ProductCategory.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';

export class ListCategoriesUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(storeId: string): Promise<ProductCategory[]> {
    const categories = await this.productRepo.findCategoriesByStoreId(storeId);
    return categories.filter((c) => c.isActive);
  }
}
