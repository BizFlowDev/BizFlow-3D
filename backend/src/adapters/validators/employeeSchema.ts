import { z } from 'zod';

/**
 * Zod schemas for employee-related request body validation.
 */

// ── Create Employee ──
export const createEmployeeSchema = z.object({
  fullName: z.string().min(1, 'Họ tên không được để trống').max(255),
  email: z.string().email('Email không đúng định dạng').max(255),
  phone: z
    .string()
    .regex(/^(03|05|07|08|09)\d{8}$/, 'Số điện thoại không hợp lệ (VD: 0901234567)')
    .max(20)
    .nullish(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
  sendEmail: z.boolean().optional(),
});

// ── Toggle Employee Status ──
export const toggleEmployeeStatusSchema = z.object({
  activate: z.boolean({ message: 'activate phải là boolean' }),
});

// ── Reset Employee Password ──
export const resetEmployeePasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ToggleEmployeeStatusInput = z.infer<typeof toggleEmployeeStatusSchema>;
export type ResetEmployeePasswordInput = z.infer<typeof resetEmployeePasswordSchema>;
