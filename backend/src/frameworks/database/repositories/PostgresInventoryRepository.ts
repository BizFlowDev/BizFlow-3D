import { InventoryTransaction } from '../../../core/entities/InventoryTransaction.js';
import { IInventoryRepository, StockLevel } from '../../../core/repositories/IInventoryRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresInventoryRepository implements IInventoryRepository {
  async findByStoreIdAndProductId(storeId: string, productId: string): Promise<InventoryTransaction[]> {
    const res = await query(
      'SELECT * FROM inventory_transactions WHERE store_id = $1 AND product_id = $2 ORDER BY created_at DESC',
      [storeId, productId]
    );
    return res.rows.map(row => InventoryTransaction.fromPersistence(mapToCamelCase(row)));
  }

  async findByStoreId(storeId: string): Promise<InventoryTransaction[]> {
    const res = await query(
      'SELECT * FROM inventory_transactions WHERE store_id = $1 ORDER BY created_at DESC',
      [storeId]
    );
    return res.rows.map(row => InventoryTransaction.fromPersistence(mapToCamelCase(row)));
  }

  async create(transaction: InventoryTransaction): Promise<InventoryTransaction> {
    const text = `
      INSERT INTO inventory_transactions (
        id, store_id, product_id, product_unit_id, type,
        quantity, reference_type, reference_id, note, created_by, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      transaction.id,
      transaction.storeId,
      transaction.productId,
      transaction.productUnitId,
      transaction.type,
      transaction.quantity,
      transaction.referenceType,
      transaction.referenceId,
      transaction.note,
      transaction.createdBy,
      transaction.createdAt,
    ];
    
    const res = await query(text, values);
    return InventoryTransaction.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async getStockLevel(storeId: string, productId: string): Promise<StockLevel> {
    // import → +quantity, export → -quantity, adjustment → ±quantity
    // Currently, quantity in DB could already be signed for adjustment. For export, we assume the entity creates it as positive, but DB logic:
    // We'll assume the `InventoryTransaction` entity handles sign (e.g. export has positive quantity, but we subtract it)
    // Actually, typically import adds, export subtracts, adjustment depends on sign.
    // Let's do explicit SUM case:
    const text = `
      SELECT 
        SUM(
          CASE 
            WHEN type = 'import' THEN quantity
            WHEN type = 'export' THEN -quantity
            WHEN type = 'adjustment' THEN quantity
            ELSE 0 
          END
        ) as total_quantity
      FROM inventory_transactions
      WHERE store_id = $1 AND product_id = $2
    `;
    const res = await query(text, [storeId, productId]);
    const totalQuantity = parseFloat(res.rows[0].total_quantity) || 0;
    
    return {
      productId,
      totalQuantity,
    };
  }

  async getAllStockLevels(storeId: string): Promise<StockLevel[]> {
    const text = `
      SELECT 
        product_id as "productId",
        SUM(
          CASE 
            WHEN type = 'import' THEN quantity
            WHEN type = 'export' THEN -quantity
            WHEN type = 'adjustment' THEN quantity
            ELSE 0 
          END
        ) as "totalQuantity"
      FROM inventory_transactions
      WHERE store_id = $1
      GROUP BY product_id
    `;
    const res = await query(text, [storeId]);
    return res.rows.map(row => ({
      productId: row.productId,
      totalQuantity: parseFloat(row.totalQuantity) || 0,
    }));
  }
}
