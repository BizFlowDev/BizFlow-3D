import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';
import { createProductSchema, updateProductSchema } from '../../../adapters/validators/productSchema.js';

const router = Router();
const { productController } = controllers;

// All product routes require authentication
router.use(authMiddleware);

router.post('/', allowRoles('owner', 'manager'), validate(createProductSchema), productController.create);
router.get('/', productController.list);
router.put('/:id', allowRoles('owner', 'manager'), validate(updateProductSchema), productController.update);
router.patch('/:id/toggle', allowRoles('owner', 'manager'), productController.toggleStatus);
router.get('/category/:categoryId', productController.getByCategory);

export default router;
