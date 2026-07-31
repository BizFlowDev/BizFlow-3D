import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';

const router = Router();
const { debtController } = controllers;

router.use(authMiddleware);

// Note: No zod schema defined yet in adapters for debt payment, assuming basic JSON payload for now
router.post('/payment', debtController.recordPayment);
router.get('/summary', debtController.getDebtSummary);

export default router;
