import { Product } from '../../entities/Product.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export class ToggleProductStatusUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(productId: string): Promise<Product> {
    const existing = await this.productRepo.findById(productId);
    if (!existing) {
      throw new NotFoundError('Sản phẩm');
    }

    return this.productRepo.toggleStatus(productId);
  }
}
