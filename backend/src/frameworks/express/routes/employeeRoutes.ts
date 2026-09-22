import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';
import {
  createEmployeeSchema,
  toggleEmployeeStatusSchema,
  resetEmployeePasswordSchema,
} from '../../../adapters/validators/employeeSchema.js';

const router = Router();
const { employeeController } = controllers;

// Yêu cầu đăng nhập; quản lý nhân viên chỉ dành cho owner
router.use(authMiddleware, allowRoles('owner'));

router.get('/', employeeController.list);
router.post('/', validate(createEmployeeSchema), employeeController.create);
router.patch('/:id/status', validate(toggleEmployeeStatusSchema), employeeController.toggleStatus);
router.patch('/:id/reset-password', validate(resetEmployeePasswordSchema), employeeController.resetPassword);
router.get('/:id/audit-log', employeeController.getAuditLog);

export default router;
