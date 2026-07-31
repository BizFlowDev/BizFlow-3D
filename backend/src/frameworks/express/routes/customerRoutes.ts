import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { createCustomerSchema, updateCustomerSchema } from '../../../adapters/validators/customerSchema.js';

const router = Router();
const { customerController } = controllers;

router.use(authMiddleware);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', customerController.list);
router.put('/:id', validate(updateCustomerSchema), customerController.update);
router.get('/:id', customerController.getById);
router.get('/:id/debt', customerController.getDebtHistory);

export default router;
