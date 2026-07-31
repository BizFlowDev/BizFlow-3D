import { z } from 'zod';

/**
 * Zod schemas for product-related request body validation.
 */

const unitSchema = z.object({
  unitName: z.string().min(1, 'Tên đơn vị không được để trống').max(50),
  conversionFactor: z.number().positive('Hệ số quy đổi phải lớn hơn 0'),
  price: z.number().min(0, 'Giá không được âm'),
  isDefault: z.boolean(),
});

// ── Create Product ──
export const createProductSchema = z.object({
  categoryId: z.string().uuid('ID danh mục không hợp lệ').nullish(),
  code: z.string().min(1, 'Mã sản phẩm không được để trống').max(100),
  name: z.string().min(1, 'Tên sản phẩm không được để trống').max(255),
  imageUrl: z.string().nullish(),
  description: z.string().nullish(),
  units: z.array(unitSchema).min(1, 'Phải có ít nhất 1 đơn vị tính'),
});

// ── Update Product ──
export const updateProductSchema = z.object({
  categoryId: z.string().uuid('ID danh mục không hợp lệ').nullish(),
  code: z.string().min(1).max(100).optional(),
  name: z.string().min(1).max(255).optional(),
  imageUrl: z.string().nullish(),
  description: z.string().nullish(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
