import { InventoryTransaction } from '../entities/InventoryTransaction.js';

export interface StockLevel {
  productId: string;
  totalQuantity: number;
}

export interface IInventoryRepository {
  findByStoreIdAndProductId(storeId: string, productId: string): Promise<InventoryTransaction[]>;
  findByStoreId(storeId: string): Promise<InventoryTransaction[]>;
  create(transaction: InventoryTransaction): Promise<InventoryTransaction>;

  /**
   * Calculate current stock level for a product by summing all inventory transactions.
   * import → +quantity, export → -quantity, adjustment → ±quantity.
   */
  getStockLevel(storeId: string, productId: string): Promise<StockLevel>;

  /** Get stock levels for all products in a store. */
  getAllStockLevels(storeId: string): Promise<StockLevel[]>;
}
