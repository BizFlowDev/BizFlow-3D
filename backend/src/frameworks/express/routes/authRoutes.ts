import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import {
  loginSchema,
  registerStoreSchema,
  changePasswordSchema,
  refreshTokenSchema,
  logoutSchema,
} from '../../../adapters/validators/authSchema.js';

const router = Router();
const { authController } = controllers;

// ── Public routes ─────────────────────────────────────────────────────────────
/** POST /api/v1/auth/login — Đăng nhập, trả về accessToken + refreshToken */
router.post('/login', validate(loginSchema), authController.login);

/** POST /api/v1/auth/register — Đăng ký cửa hàng mới + tài khoản owner */
router.post('/register', validate(registerStoreSchema), authController.registerStore);

/** POST /api/v1/auth/refresh — Làm mới cặp token (token rotation) */
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

/** POST /api/v1/auth/logout — Đăng xuất, xóa refreshToken khỏi Redis */
router.post('/logout', validate(logoutSchema), authController.logout);

// ── Protected routes ──────────────────────────────────────────────────────────
/** POST /api/v1/auth/change-password — Đổi mật khẩu (yêu cầu xác thực) */
router.post(
  '/change-password',
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword,
);

export default router;
