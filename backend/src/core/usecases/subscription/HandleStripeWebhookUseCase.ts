import Stripe from 'stripe';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { ISubscriptionOrderRepository } from '../../repositories/ISubscriptionOrderRepository.js';
import { ISubscriptionHistoryRepository } from '../../repositories/ISubscriptionHistoryRepository.js';
import { ManageStoreSubscriptionUseCase } from '../admin/ManageStoreSubscriptionUseCase.js';
import { StripeGateway } from '../../../frameworks/payment/StripeGateway.js';
import { appEventEmitter } from '../../../frameworks/websocket/eventEmitter.js';

export class HandleStripeWebhookUseCase {
  constructor(
    private readonly stripeGateway: StripeGateway,
    private readonly storeRepo: IStoreRepository,
    private readonly orderRepo: ISubscriptionOrderRepository,
    private readonly historyRepo: ISubscriptionHistoryRepository,
    private readonly manageSubscriptionUseCase: ManageStoreSubscriptionUseCase,
  ) {}

  async execute(payload: Buffer | string, signature: string): Promise<{ received: boolean; message?: string }> {
    const event = this.stripeGateway.constructWebhookEvent(payload, signature);

    console.log(`[Stripe Webhook] Nhận sự kiện: ${event.type} (id: ${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionCompleted(session);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSessionExpired(session);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Bỏ qua sự kiện không quan tâm: ${event.type}`);
    }

    return { received: true };
  }

  public async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.orderId;
    const storeId = session.metadata?.storeId;
    const planSlug = session.metadata?.planSlug;
    const durationMonths = Number(session.metadata?.durationMonths) || 1;

    let order = orderId ? await this.orderRepo.findById(orderId) : null;
    if (!order && session.id) {
      order = await this.orderRepo.findByStripeSessionId(session.id);
    }

    if (!order) {
      console.warn(`[Stripe Webhook] Không tìm thấy SubscriptionOrder cho session: ${session.id}`);
      return;
    }

    // Idempotency: Kiểm tra nếu đơn đã hoàn thành thì bỏ qua
    if (order.status === 'completed') {
      console.log(`[Stripe Webhook] Đơn hàng ${order.id} đã hoàn tất trước đó, bỏ qua xử lý lặp.`);
      return;
    }

    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

    // 1. Cập nhật trạng thái đơn hàng sang completed
    await this.orderRepo.updateStatus(order.id, 'completed', {
      stripePaymentIntentId: paymentIntentId,
      metadata: {
        paidAt: new Date().toISOString(),
        stripeCustomer: session.customer,
      },
    });

    const targetStoreId = storeId || order.storeId;
    const targetPlan = planSlug || order.planSlug;

    const currentStore = await this.storeRepo.findById(targetStoreId);
    if (!currentStore) {
      console.error(`[Stripe Webhook] Store ${targetStoreId} không tồn tại khi kích hoạt gói`);
      return;
    }

    // Kiểm tra tính thứ tự: Không cho phép đơn hàng cũ hơn ghi đè gói của đơn hàng mới hơn đã hoàn tất
    const completedOrders = await this.orderRepo.findAll({
      storeId: targetStoreId,
      status: 'completed',
      limit: 1,
    });
    const newestCompletedOrder = completedOrders.items[0];
    const isNewerOrderAlreadyApplied =
      newestCompletedOrder &&
      newestCompletedOrder.id !== order.id &&
      new Date(newestCompletedOrder.createdAt).getTime() > new Date(order.createdAt).getTime();

    if (isNewerOrderAlreadyApplied) {
      console.warn(
        `[Stripe Webhook] Đơn hàng ${order.id} (gói ${targetPlan}, tạo ${order.createdAt}) cũ hơn đơn đã hoàn tất ${newestCompletedOrder.id} (gói ${newestCompletedOrder.planSlug}, tạo ${newestCompletedOrder.createdAt}). Bỏ qua cập nhật đè gói cửa hàng.`
      );
      return;
    }

    // 2. Kích hoạt nâng cấp gói dịch vụ cho store
    const updatedStore = await this.manageSubscriptionUseCase.execute({
      storeId: targetStoreId,
      plan: targetPlan,
      durationMonths,
    });

    // 3. Ghi nhận lịch sử chuyển đổi gói
    await this.historyRepo.create({
      storeId: targetStoreId,
      storeName: currentStore.name,
      oldPlan: currentStore.subscriptionPlan,
      newPlan: targetPlan,
      oldStatus: currentStore.subscriptionStatus,
      newStatus: 'active',
      changedByName: 'Cổng thanh toán Stripe (Tự động)',
      note: `Nâng cấp gói qua Stripe Checkout QR thành công. Mã giao dịch: ${session.id}`,
    });

    // 4. Bắn sự kiện realtime qua Socket.IO tới cửa hàng
    appEventEmitter.emit('subscription:upgraded', {
      storeId: targetStoreId,
      orderId: order.id,
      plan: targetPlan,
      planName: (order.metadata?.planName as string) || targetPlan,
      expiresAt: updatedStore.subscriptionExpiresAt ? updatedStore.subscriptionExpiresAt.toISOString() : '',
    });

    console.log(`[Stripe Webhook] Kích hoạt thành công gói ${targetPlan} cho store ${currentStore.name} (${targetStoreId})`);
  }

  public async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const orderId = session.metadata?.orderId;
    let order = orderId ? await this.orderRepo.findById(orderId) : null;
    if (!order && session.id) {
      order = await this.orderRepo.findByStripeSessionId(session.id);
    }

    if (order && order.status === 'pending') {
      await this.orderRepo.updateStatus(order.id, 'expired');
      console.log(`[Stripe Webhook] Đơn hàng ${order.id} đã hết hạn thanh toán`);
    }
  }
}
