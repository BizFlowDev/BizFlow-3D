import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';
import { importStockSchema } from '../../../adapters/validators/inventorySchema.js';

const router = Router();
const { inventoryController } = controllers;

router.use(authMiddleware);

router.post('/import', allowRoles('owner', 'manager'), validate(importStockSchema), inventoryController.importStock);
router.get('/stock', inventoryController.getStockLevel);
router.get('/transactions', allowRoles('owner', 'manager'), inventoryController.getTransactionHistory);

export default router;
