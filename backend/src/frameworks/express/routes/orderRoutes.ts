import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { createOrderSchema } from '../../../adapters/validators/orderSchema.js';

const router = Router();
const { orderController } = controllers;

router.use(authMiddleware);

router.post('/stripe-session', orderController.createStripeSession);
router.get('/stripe-session/:sessionId/status', orderController.getStripeSessionStatus);

router.post('/', validate(createOrderSchema), orderController.create);
router.get('/', orderController.list);
router.get('/:id', orderController.getById);
router.patch('/:id/confirm', orderController.confirmOrder);
router.patch('/:id/cancel', orderController.cancelOrder);

export default router;
