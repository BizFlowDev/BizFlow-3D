import { z } from 'zod';

/**
 * Zod schemas for authentication-related request body validation.
 */

// ── Login ──
export const loginSchema = z.object({
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});

// ── Register Store ──
export const registerStoreSchema = z.object({
  storeName: z.string().min(1, 'Tên cửa hàng không được để trống').max(255),
  storeAddress: z.string().nullish(),
  storePhone: z.string().max(20).nullish(),
  storeEmail: z.string().email('Email cửa hàng không đúng định dạng').max(255).nullish(),
  taxCode: z.string().max(50).nullish(),
  ownerFullName: z.string().min(1, 'Tên chủ cửa hàng không được để trống').max(255),
  ownerEmail: z.string().email('Email không đúng định dạng').max(255),
  ownerPhone: z.string().max(20).nullish(),
  ownerPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// ── Change Password ──
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Xác nhận mật khẩu không được để trống'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

// ── Refresh Token ──
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

// ── Logout ──
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token không được để trống'),
});

// ── Inferred types ──
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStoreInput = z.infer<typeof registerStoreSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
