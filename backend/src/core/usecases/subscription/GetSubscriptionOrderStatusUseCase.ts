import { ISubscriptionOrderRepository } from '../../repositories/ISubscriptionOrderRepository.js';
import { StripeGateway } from '../../../frameworks/payment/StripeGateway.js';
import { HandleStripeWebhookUseCase } from './HandleStripeWebhookUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { AuthenticationError } from '../../errors/AuthenticationError.js';

export class GetSubscriptionOrderStatusUseCase {
  constructor(
    private readonly orderRepo: ISubscriptionOrderRepository,
    private readonly stripeGateway?: StripeGateway,
    private readonly webhookUseCase?: HandleStripeWebhookUseCase,
  ) {}

  async execute(orderId: string, storeId?: string) {
    let order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError('Đơn hàng đăng ký gói');
    }

    if (storeId && order.storeId !== storeId) {
      throw new AuthenticationError('Bạn không có quyền xem đơn hàng này');
    }

    // Tự động kiểm tra trực tiếp với Stripe nếu đơn đang ở trạng thái pending
    if (order.status === 'pending' && order.stripeSessionId && this.stripeGateway && this.webhookUseCase) {
      try {
        const session = await this.stripeGateway.retrieveCheckoutSession(order.stripeSessionId);
        if (session.payment_status === 'paid') {
          console.log(`[AutoSync] Phát hiện đơn hàng ${order.id} đã hoàn tất trên Stripe. Tự động kích hoạt.`);
          await this.webhookUseCase.handleCheckoutSessionCompleted(session);
          const updated = await this.orderRepo.findById(orderId);
          if (updated) {
            order = updated;
          }
        } else if (session.status === 'expired') {
          await this.webhookUseCase.handleCheckoutSessionExpired(session);
          const updated = await this.orderRepo.findById(orderId);
          if (updated) {
            order = updated;
          }
        }
      } catch (err: any) {
        console.warn(`[AutoSync] Lỗi tra cứu Stripe session ${order.stripeSessionId}:`, err.message);
      }
    }

    return {
      id: order.id,
      storeId: order.storeId,
      planSlug: order.planSlug,
      durationMonths: order.durationMonths,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      checkoutUrl: order.checkoutUrl,
      qrCodeUrl: order.qrCodeUrl,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
