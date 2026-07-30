import { Product } from '../../entities/Product.js';
import { IProductRepository, ProductFilter, PaginatedResult } from '../../repositories/IProductRepository.js';

export interface ListProductsInput {
  storeId: string;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListProductsUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: ListProductsInput): Promise<PaginatedResult<Product>> {
    const filter: ProductFilter = {
      storeId: input.storeId,
      categoryId: input.categoryId,
      isActive: input.isActive,
      search: input.search,
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100), // Cap at 100
    };

    return this.productRepo.search(filter);
  }
}
