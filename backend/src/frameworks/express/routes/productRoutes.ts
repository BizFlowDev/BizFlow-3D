import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';
import { createProductSchema, updateProductSchema } from '../../../adapters/validators/productSchema.js';
import { createCategorySchema, updateCategorySchema } from '../../../adapters/validators/categorySchema.js';

const router = Router();
const { productController } = controllers;

// All product routes require authentication
router.use(authMiddleware);

// ── Categories routes (placed before /:id) ──
router.get('/categories', productController.listCategories);
router.post('/categories', allowRoles('owner', 'manager'), validate(createCategorySchema), productController.createCategory);
router.put('/categories/:id', allowRoles('owner', 'manager'), validate(updateCategorySchema), productController.updateCategory);
router.delete('/categories/:id', allowRoles('owner', 'manager'), productController.deleteCategory);

// ── Products routes ──
router.post('/', allowRoles('owner', 'manager'), validate(createProductSchema), productController.create);
router.get('/', productController.list);
router.put('/:id', allowRoles('owner', 'manager'), validate(updateProductSchema), productController.update);
router.patch('/:id/toggle', allowRoles('owner', 'manager'), productController.toggleStatus);
router.delete('/:id', allowRoles('owner', 'manager'), productController.delete);
router.get('/category/:categoryId', productController.getByCategory);

export default router;
