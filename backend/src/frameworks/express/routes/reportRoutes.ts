import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';

const router = Router();
const { reportController } = controllers;

router.use(authMiddleware);

// Reports are restricted to owners and managers
router.use(allowRoles('owner', 'manager'));

router.get('/daily-revenue', reportController.getDailyRevenue);
router.get('/top-products', reportController.getTopProducts);
router.get('/debt-summary', reportController.getDebtSummary);

export default router;
