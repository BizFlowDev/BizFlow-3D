import { z } from 'zod';

/**
 * Zod schemas for category-related request body validation.
 */

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(255, 'Tên danh mục không quá 255 ký tự'),
  description: z.string().max(1000, 'Mô tả không quá 1000 ký tự').nullish(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục không được để trống').max(255, 'Tên danh mục không quá 255 ký tự').optional(),
  description: z.string().max(1000, 'Mô tả không quá 1000 ký tự').nullish(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
