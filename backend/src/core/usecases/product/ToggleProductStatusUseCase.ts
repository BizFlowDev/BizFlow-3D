import { Product } from '../../entities/Product.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';

export class ToggleProductStatusUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(productId: string): Promise<Product> {
    const existing = await this.productRepo.findById(productId);
    if (!existing) {
      throw new NotFoundError('Sản phẩm');
    }

    const product = await this.productRepo.toggleStatus(productId);
    appEventEmitter.emit('product:updated', { storeId: product.storeId, productId: product.id });
    return product;
  }
}
