import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';

const router = Router();
const { adminController } = controllers;

router.use(authMiddleware);

// System admin only routes
router.use(allowRoles('admin'));

router.patch('/stores/:storeId/subscription', adminController.manageStores);
router.get('/analytics', adminController.getSystemAnalytics);
router.put('/system-config', adminController.updateSystemConfig);

export default router;
