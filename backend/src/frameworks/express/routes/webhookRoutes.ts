import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { controllers } from '../../../config/diContainer.js';

const router = Router();

/**
 * POST /api/v1/webhooks/stripe
 * Stripe Webhook: Lắng nghe sự kiện thanh toán từ Stripe
 * Chú ý: Bắt buộc dùng express.raw() để kiểm tra chữ ký HMAC
 */
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        res.status(400).send('Webhook Error: Thiếu header stripe-signature');
        return;
      }

      const result = await controllers.handleStripeWebhookUseCase.execute(req.body, sig);
      res.status(200).json(result);
    } catch (err: any) {
      console.error('[Stripe Webhook Error]:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  },
);

export default router;
