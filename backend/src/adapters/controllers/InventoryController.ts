import type { Request, Response, NextFunction } from 'express';
import { ImportStockUseCase } from '../../core/usecases/inventory/ImportStockUseCase.js';
import { GetInventoryLevelUseCase } from '../../core/usecases/inventory/GetInventoryLevelUseCase.js';
import type { IInventoryRepository } from '../../core/repositories/IInventoryRepository.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';

/**
 * Inventory controller.
 * Handles stock import, stock level queries, and transaction history.
 */
export class InventoryController {
  constructor(
    private readonly importStockUseCase: ImportStockUseCase,
    private readonly getInventoryLevelUseCase: GetInventoryLevelUseCase,
    private readonly inventoryRepo: IInventoryRepository,
  ) {}

  /**
   * POST /api/inventory/import
   * Body: { productId, quantity, productUnitId?, note? }
   */
  importStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.importStockUseCase.execute({
        ...req.body,
        storeId,
        createdBy: req.user?.userId,
      });

      const response = ApiResponse.created(result, 'Nhập kho thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/inventory/stock-level
   * Query: { productId? }
   * If productId is provided, returns stock for that product.
   * Otherwise, returns stock for all products in the store.
   */
  getStockLevel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const productId = req.query.productId as string | undefined;

      if (productId) {
        const result = await this.getInventoryLevelUseCase.execute(storeId, productId);
        const response = ApiResponse.success(result, 'Lấy tồn kho thành công');
        res.status(response.statusCode).json(response.toJSON());
      } else {
        const result = await this.getInventoryLevelUseCase.executeAll(storeId);
        const response = ApiResponse.success(result, 'Lấy tồn kho toàn bộ sản phẩm thành công');
        res.status(response.statusCode).json(response.toJSON());
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/inventory/transactions
   * Query: { productId? }
   * Returns inventory transaction history for a product or all products in the store.
   */
  getTransactionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const productId = req.query.productId as string | undefined;

      const result = productId
        ? await this.inventoryRepo.findByStoreIdAndProductId(storeId, productId)
        : await this.inventoryRepo.findByStoreId(storeId);

      const response = ApiResponse.success(result, 'Lấy lịch sử giao dịch kho thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
