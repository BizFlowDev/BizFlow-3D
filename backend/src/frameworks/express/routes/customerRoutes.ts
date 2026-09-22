import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { createCustomerSchema, updateCustomerSchema } from '../../../adapters/validators/customerSchema.js';

const router = Router();
const { customerController, debtController } = controllers;

router.use(authMiddleware);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', customerController.list);
router.put('/:id', validate(updateCustomerSchema), customerController.update);
router.get('/:id', customerController.getById);
router.get('/:id/debt', customerController.getDebtHistory);
router.post('/:id/debts/pay', (req, res, next) => {
  req.body = { ...req.body, customerId: req.params.id };
  return debtController.recordPayment(req, res, next);
});
router.delete('/:id', customerController.delete);

export default router;
