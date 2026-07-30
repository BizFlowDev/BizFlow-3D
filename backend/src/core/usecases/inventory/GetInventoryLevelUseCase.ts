import { IInventoryRepository, StockLevel } from '../../repositories/IInventoryRepository.js';

export class GetInventoryLevelUseCase {
  constructor(private readonly inventoryRepo: IInventoryRepository) {}

  /** Get stock level for a single product. */
  async execute(storeId: string, productId: string): Promise<StockLevel> {
    return this.inventoryRepo.getStockLevel(storeId, productId);
  }

  /** Get stock levels for all products in a store. */
  async executeAll(storeId: string): Promise<StockLevel[]> {
    return this.inventoryRepo.getAllStockLevels(storeId);
  }
}
