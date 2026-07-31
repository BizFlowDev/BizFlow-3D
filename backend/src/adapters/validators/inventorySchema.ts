import { z } from 'zod';

/**
 * Zod schemas for inventory-related request body validation.
 */

// ── Import Stock ──
export const importStockSchema = z.object({
  productId: z.string().uuid('ID sản phẩm không hợp lệ'),
  productUnitId: z.string().uuid('ID đơn vị sản phẩm không hợp lệ').nullish(),
  quantity: z.number().positive('Số lượng nhập phải lớn hơn 0'),
  note: z.string().nullish(),
});

export type ImportStockInput = z.infer<typeof importStockSchema>;
