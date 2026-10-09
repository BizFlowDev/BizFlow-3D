import { z } from 'zod';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { ISubscriptionPlanRepository } from '../../repositories/ISubscriptionPlanRepository.js';
import { ISubscriptionOrderRepository } from '../../repositories/ISubscriptionOrderRepository.js';
import { SubscriptionOrder } from '../../entities/SubscriptionOrder.js';
import { StripeGateway } from '../../../frameworks/payment/StripeGateway.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import env from '../../../config/index.js';

const CreateStripeSessionInputSchema = z.object({
  storeId: z.string().uuid(),
  planSlug: z.string().min(1),
  durationMonths: z.coerce.number().int().min(1).max(60).default(1),
  userEmail: z.string().email().optional(),
});

export type CreateStripeSessionInput = z.infer<typeof CreateStripeSessionInputSchema>;

export interface CreateStripeSessionOutput {
  orderId: string;
  sessionId: string;
  checkoutUrl: string;
  qrCodeUrl: string;
  amount: number;
  currency: string;
  planSlug: string;
  planName: string;
  durationMonths: number;
  expiresAt: string;
}

const DURATION_DISCOUNTS: Record<number, number> = {
  1: 0,
  3: 10,
  6: 15,
  12: 20,
};

export class CreateStripeUpgradeSessionUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly planRepo: ISubscriptionPlanRepository,
    private readonly orderRepo: ISubscriptionOrderRepository,
    private readonly stripeGateway: StripeGateway,
  ) {}

  async execute(input: CreateStripeSessionInput): Promise<CreateStripeSessionOutput> {
    const parsed = CreateStripeSessionInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu yêu cầu thanh toán không hợp lệ', fields);
    }

    const { storeId, planSlug, durationMonths, userEmail } = parsed.data;

    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Cửa hàng');
    }

    const plan = await this.planRepo.findBySlug(planSlug);
    if (!plan || !plan.isActive) {
      throw new NotFoundError('Gói dịch vụ');
    }

    // Tính toán số tiền sau chiết khấu
    const basePrice = (plan.price ?? 0) * durationMonths;
    const discountPercent = DURATION_DISCOUNTS[durationMonths] ?? 0;
    const discountAmount = Math.round((basePrice * discountPercent) / 100);
    const finalAmount = Math.max(0, basePrice - discountAmount);

    if (finalAmount <= 0) {
      throw new ValidationError('Gói dịch vụ này miễn phí, không yêu cầu thanh toán qua Stripe.');
    }

    // Tự động hủy các đơn hàng pending cũ của cửa hàng này để không bị rác đơn và treo chờ thanh toán
    try {
      const existingPendingOrders = await this.orderRepo.findAll({
        storeId,
        status: 'pending',
        limit: 50,
      });
      for (const oldOrder of existingPendingOrders.items) {
        await this.orderRepo.updateStatus(oldOrder.id, 'cancelled');
        console.log(`[Stripe Checkout] Tự động hủy đơn hàng pending cũ ${oldOrder.id} của store ${storeId}`);
      }
    } catch (cleanupErr: any) {
      console.warn(`[Stripe Checkout] Cảnh báo dọn dẹp đơn cũ:`, cleanupErr.message);
    }

    // 1. Tạo bản ghi đơn hàng với trạng thái pending
    const orderId = crypto.randomUUID();
    const currency = env.STRIPE_CURRENCY || 'vnd';

    // 2. Tạo Stripe Checkout Session
    const sessionResult = await this.stripeGateway.createCheckoutSession({
      orderId,
      storeId,
      storeName: store.name,
      planSlug: plan.slug,
      planName: plan.name,
      durationMonths,
      amount: finalAmount,
      customerEmail: userEmail || store.email || undefined,
    });

    // 3. Lưu vào database
    const subscriptionOrder = SubscriptionOrder.create({
      id: orderId,
      storeId,
      planId: plan.id,
      planSlug: plan.slug,
      durationMonths,
      amount: finalAmount,
      currency,
      paymentMethod: 'stripe',
      status: 'pending',
      stripeSessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      qrCodeUrl: sessionResult.qrCodeUrl,
      metadata: {
        planName: plan.name,
        discountPercent,
        discountAmount,
        basePrice,
      },
    });

    await this.orderRepo.create(subscriptionOrder);

    return {
      orderId,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      qrCodeUrl: sessionResult.qrCodeUrl,
      amount: finalAmount,
      currency,
      planSlug: plan.slug,
      planName: plan.name,
      durationMonths,
      expiresAt: sessionResult.expiresAt.toISOString(),
    };
  }
}
