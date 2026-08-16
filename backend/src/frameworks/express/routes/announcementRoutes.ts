import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';

const router = Router();
const { adminController } = controllers;

// ── Public (authenticated) routes ─────────────────────────────────────────────
// Bất kỳ user đã đăng nhập (owner/employee/admin) đều đọc được các thông báo
// broadcast chung để khôi phục chuông thông báo sau khi login/làm mới trang.
router.get('/', authMiddleware, adminController.listAnnouncements);

export default router;
