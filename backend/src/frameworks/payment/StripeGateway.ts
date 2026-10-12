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

    const expiresAtTimestamp = Math.floor(Date.now() / 1000) + 30 * 60; // 30 minutes from now

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
      expiresAt: new Date(expiresAtTimestamp * 1000),
    };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    const client = this.ensureClient();
    return client.checkout.sessions.retrieve(sessionId);
  }

  constructWebhookEvent(payload: Buffer | string, signature: string): Stripe.Event {
    const client = this.ensureClient();
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('STRIPE_WEBHOOK_SECRET chưa được cấu hình');
    }
    return client.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  }
}
