import { z } from 'zod';

/**
 * Zod schemas for customer-related request body validation.
 */

// ── Create Customer ──
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Tên khách hàng không được để trống').max(255),
  phone: z.string().max(20, 'Số điện thoại không được quá 20 ký tự').nullish(),
  email: z.string().email('Email không đúng định dạng').max(255).nullish(),
  address: z.string().nullish(),
  note: z.string().nullish(),
  creditLimit: z.coerce.number().min(0, 'Hạn mức nợ không được âm').default(0).optional(),
  paymentTermDays: z.coerce.number().int().min(1, 'Thời hạn nợ tối thiểu 1 ngày').default(30).optional(),
});

// ── Update Customer ──
export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(20).nullish(),
  email: z.string().email('Email không đúng định dạng').max(255).nullish(),
  address: z.string().nullish(),
  note: z.string().nullish(),
  creditLimit: z.coerce.number().min(0, 'Hạn mức nợ không được âm').optional(),
  paymentTermDays: z.coerce.number().int().min(1, 'Thời hạn nợ tối thiểu 1 ngày').optional(),
  isActive: z.boolean().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
