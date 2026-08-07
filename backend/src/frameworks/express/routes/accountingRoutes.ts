import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';

const router = Router();
const { accountingController } = controllers;

router.use(authMiddleware);

// Báo cáo tài chính — chỉ owner/manager
router.use(allowRoles('owner', 'manager'));

router.get('/financial-report', accountingController.getFinancialReport);

export default router;