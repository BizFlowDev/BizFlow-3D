import { Product } from '../../entities/Product.js';
import { ProductUnit } from '../../entities/ProductUnit.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { cloudinaryService } from '../../../frameworks/services/CloudinaryService.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';

export interface UpdateProductUnitInput {
  id?: string;
  unitName: string;
  conversionFactor: number;
  price: number;
  isDefault: boolean;
}

export interface UpdateProductInput {
  productId: string;
  storeId: string;
  categoryId?: string | null;
  code?: string;
  name?: string;
  imageUrl?: string | null;
  description?: string | null;
  hasMultipleUnits?: boolean;
  units?: UpdateProductUnitInput[];
}

export interface UpdateProductOutput {
  product: Product;
  units: ProductUnit[];
}

export class UpdateProductUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: UpdateProductInput): Promise<UpdateProductOutput> {
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

    // 3. Validate units if provided
    if (input.units && input.units.length > 0) {
      const defaultUnits = input.units.filter((u) => u.isDefault);
      if (defaultUnits.length !== 1) {
        throw new ValidationError('Phải có đúng 1 đơn vị mặc định');
      }
    }

    // 4. Determine image cleanup
    const oldImageUrl = existing.imageUrl;
    const isImageChanging =
      input.imageUrl !== undefined && input.imageUrl !== oldImageUrl;

    // 5. Build update data for product table
    const updateData: {
      categoryId?: string | null;
      code?: string;
      name?: string;
      imageUrl?: string | null;
      description?: string | null;
      hasMultipleUnits?: boolean;
    } = {};
    if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.hasMultipleUnits !== undefined) updateData.hasMultipleUnits = input.hasMultipleUnits;

    const updatedProduct = await this.productRepo.update(input.productId, updateData);

    // 6. Sync units if provided
    let units: ProductUnit[];
    if (input.units && input.units.length > 0) {
      const unitEntities = input.units.map((u) =>
        ProductUnit.create({
          id: u.id, // preserve existing ID if provided
          productId: input.productId,
          unitName: u.unitName,
          conversionFactor: u.conversionFactor,
          price: u.price,
          isDefault: u.isDefault,
        }),
      );
      units = await this.productRepo.syncUnits(input.productId, unitEntities);
    } else {
      units = await this.productRepo.findUnitsByProductId(input.productId);
    }

    // Attach units to product for consistency
    updatedProduct.units = units;

    // Notify only after both product details and units have been saved.
    appEventEmitter.emit('product:updated', {
      storeId: updatedProduct.storeId,
      productId: updatedProduct.id,
    });

    // 7. Cleanup old Cloudinary image (non-blocking)
    if (isImageChanging && oldImageUrl) {
      try {
        await cloudinaryService.deleteImageByUrl(oldImageUrl);
        console.log('[UpdateProductUseCase] Cleaned up old Cloudinary image:', oldImageUrl);
      } catch (err) {
        console.error('[UpdateProductUseCase] Failed to delete old Cloudinary image:', err);
      }
    }

    return { product: updatedProduct, units };
  }
}
