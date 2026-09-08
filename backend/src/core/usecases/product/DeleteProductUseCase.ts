import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { AuthorizationError } from '../../errors/AuthorizationError.js';
import { cloudinaryService } from '../../../frameworks/services/CloudinaryService.js';

export interface DeleteProductInput {
  productId: string;
  storeId: string;
}

export class DeleteProductUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: DeleteProductInput): Promise<void> {
    // 1. Tìm sản phẩm
    const existing = await this.productRepo.findById(input.productId);
    if (!existing) {
      throw new NotFoundError('Sản phẩm');
    }

    // 2. Xác minh sản phẩm thuộc store
    if (existing.storeId !== input.storeId) {
      throw new AuthorizationError('Bạn không có quyền xóa sản phẩm này');
    }

    // 3. Lưu lại imageUrl trước khi xóa
    const imageUrl = existing.imageUrl;

    // 4. Xóa product_units trước (foreign key), rồi xóa product
    await this.productRepo.deleteUnitsByProductId(input.productId);
    await this.productRepo.delete(input.productId);

    // 5. Dọn dẹp ảnh trên Cloudinary (non-blocking, không throw)
    if (imageUrl) {
      try {
        await cloudinaryService.deleteImageByUrl(imageUrl);
        console.log('[DeleteProductUseCase] Cleaned up Cloudinary image:', imageUrl);
      } catch (err) {
        console.error('[DeleteProductUseCase] Failed to delete Cloudinary image:', err);
        // Không throw - sản phẩm đã xóa trong DB thành công
      }
    }
  }
}
