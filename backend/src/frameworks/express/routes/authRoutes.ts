import { Router } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { validate } from '../../../adapters/middleware/validateMiddleware.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { loginSchema, registerStoreSchema, changePasswordSchema } from '../../../adapters/validators/authSchema.js';

const router = Router();
const { authController } = controllers;

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerStoreSchema), authController.registerStore);
router.put('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

export default router;
