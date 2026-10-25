import Stripe from 'stripe';
import QRCode from 'qrcode';
import env from '../../config/index.js';

export interface CreateCheckoutSessionParams {
  orderId: string;
  storeId: string;
  storeName: string;
  planSlug: string;
  planName: string;
  durationMonths: number;
  amount: number; // In VND (e.g. 199000)
  customerEmail?: string | null;
}

export interface CreateOrderCheckoutSessionParams {
  storeId: string;
  storeName: string;
  amount: number; // In VND
  orderCode?: string;
  customerName?: string | null;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  qrCodeUrl: string;
  expiresAt: Date;
}

export class StripeGateway {
  private stripe: Stripe | null = null;

  constructor() {
    if (env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
    }
  }

  private ensureClient(): Stripe {
    if (!this.stripe) {
      if (env.STRIPE_SECRET_KEY) {
        this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
      } else {
        throw new Error('STRIPE_SECRET_KEY chưa được cấu hình');
      }
    }
    return this.stripe;
  }

  async generateQrCodeDataUrl(text: string): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  }

  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const client = this.ensureClient();

    const frontendBase = env.FRONTEND_URL.replace(/\/+$/, '');
    const successUrl = `${frontendBase}?payment_status=success&session_id={CHECKOUT_SESSION_ID}&order_id=${params.orderId}`;
    const cancelUrl = `${frontendBase}?payment_status=cancelled&order_id=${params.orderId}`;

    // Quy định thời gian hiệu lực mã thanh toán là 15 phút
    const fifteenMinutesMs = 15 * 60 * 1000;
    const sessionExpiresAt = new Date(Date.now() + fifteenMinutesMs);

    // Stripe API yêu cầu expires_at tối thiểu là 30 phút từ thời điểm tạo
    const expiresAtTimestamp = Math.floor(Date.now() / 1000) + 30 * 60;

    const currency = env.STRIPE_CURRENCY || 'vnd';
    // Stripe VND is a zero-decimal currency (1 VND = 1 unit).
    // If currency is USD, multiply by 100 (cents).
    const unitAmount = currency === 'vnd' ? Math.round(params.amount) : Math.round(params.amount * 100);

    const session = await client.checkout.sessions.create({
      mode: 'payment',
      customer_email: params.customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Gói ${params.planName} (${params.durationMonths} tháng)`,
              description: `Nâng cấp / Gia hạn bản quyền BizFlow 3D cho cửa hàng: ${params.storeName}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: params.orderId,
        storeId: params.storeId,
        planSlug: params.planSlug,
        durationMonths: params.durationMonths.toString(),
      },
      expires_at: expiresAtTimestamp,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error('Không thể tạo liên kết thanh toán Stripe');
    }

    const qrCodeUrl = await this.generateQrCodeDataUrl(session.url);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      qrCodeUrl,
      expiresAt: sessionExpiresAt,
    };
  }

  async createOrderCheckoutSession(params: CreateOrderCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const client = this.ensureClient();

    const frontendBase = env.FRONTEND_URL.replace(/\/+$/, '');
    const successUrl = `${frontendBase}/orders?stripe_payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${frontendBase}/orders/new?stripe_payment=cancelled`;

    // Quy định thời gian hiệu lực mã thanh toán là 15 phút
    const fifteenMinutesMs = 15 * 60 * 1000;
    const sessionExpiresAt = new Date(Date.now() + fifteenMinutesMs);

    // Stripe API yêu cầu expires_at tối thiểu là 30 phút từ thời điểm tạo
    const expiresAtTimestamp = Math.floor(Date.now() / 1000) + 30 * 60;

    const currency = env.STRIPE_CURRENCY || 'vnd';
    const unitAmount = currency === 'vnd' ? Math.round(params.amount) : Math.round(params.amount * 100);

    const lineItems = (params.items && params.items.length > 0)
      ? params.items.slice(0, 15).map((item) => ({
          price_data: {
            currency,
            product_data: {
              name: item.name,
              description: `Cửa hàng: ${params.storeName}`,
            },
            unit_amount: currency === 'vnd' ? Math.round(item.unitPrice) : Math.round(item.unitPrice * 100),
          },
          quantity: item.quantity,
        }))
      : [
          {
            price_data: {
              currency,
              product_data: {
                name: `Thanh toán đơn hàng ${params.orderCode || ''}`.trim(),
                description: `Cửa hàng: ${params.storeName}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ];

    const session = await client.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        type: 'retail_order',
        storeId: params.storeId,
        orderCode: params.orderCode || '',
        customerName: params.customerName || '',
        amount: params.amount.toString(),
      },
      expires_at: expiresAtTimestamp,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      throw new Error('Không thể tạo liên kết thanh toán Stripe cho đơn hàng');
    }

    const qrCodeUrl = await this.generateQrCodeDataUrl(session.url);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      qrCodeUrl,
      expiresAt: sessionExpiresAt,
    };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const client = this.ensureClient();
    return client.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Hủy hoặc làm hết hạn phiên Stripe Checkout ngay lập tức
   */
  async expireCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
    const client = this.ensureClient();
    try {
      return await client.checkout.sessions.expire(sessionId);
    } catch (err: any) {
      console.warn(`[StripeGateway] Không thể hết hạn session ${sessionId}:`, err?.message || err);
      return null;
    }
  }

  constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
    const client = this.ensureClient();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET chưa được cấu hình');
    }
    return client.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  }
}
