import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export interface DeleteCategoryInput {
  id: string;
  storeId: string;
}

export class DeleteCategoryUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const existing = await this.productRepo.findCategoryById(input.id);
    if (!existing || existing.storeId !== input.storeId) {
      throw new NotFoundError('Danh mục', 'Danh mục không tồn tại trong cửa hàng');
    }

    await this.productRepo.deleteCategory(input.id);
  }
}
