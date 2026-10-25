import type { Request, Response, NextFunction } from 'express';
import { CreateOrderUseCase } from '../../core/usecases/order/CreateOrderUseCase.js';
import { ListOrdersUseCase } from '../../core/usecases/order/ListOrdersUseCase.js';
import { GetOrderDetailUseCase } from '../../core/usecases/order/GetOrderDetailUseCase.js';
import { ConfirmOrderUseCase } from '../../core/usecases/order/ConfirmOrderUseCase.js';
import type { IOrderRepository } from '../../core/repositories/IOrderRepository.js';
import type { IStoreRepository } from '../../core/repositories/IStoreRepository.js';
import type { StripeGateway } from '../../frameworks/payment/StripeGateway.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { NotFoundError } from '../../core/errors/NotFoundError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * Order controller.
 * Handles order creation, listing, detail, confirmation, cancellation, and Stripe checkout sessions.
 */
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly orderRepo: IOrderRepository,
    private readonly stripeGateway?: StripeGateway,
    private readonly storeRepo?: IStoreRepository,
  ) {}

  /**
   * POST /api/orders
   * Body: { customerId?, items[], note?, discountAmount?, debtAmount? }
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.createOrderUseCase.execute({
        storeId,
        userId: req.user?.userId,
        ...req.body,
      });

      const response = ApiResponse.created(result, 'Tạo đơn hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders
   * Query: { status?, customerId?, orderType?, fromDate?, toDate?, page?, limit? }
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      let fromDate: Date | undefined;
      if (req.query.fromDate) {
        const rawFrom = req.query.fromDate as string;
        if (rawFrom.length === 10) {
          fromDate = new Date(`${rawFrom}T00:00:00+07:00`);
        } else if (!rawFrom.endsWith('Z') && !rawFrom.includes('+') && !rawFrom.includes('-', 10)) {
          fromDate = new Date(`${rawFrom}+07:00`);
        } else {
          fromDate = new Date(rawFrom);
        }
      }

      let toDate: Date | undefined;
      if (req.query.toDate) {
        const rawTo = req.query.toDate as string;
        if (rawTo.length === 10) {
          toDate = new Date(`${rawTo}T23:59:59.999+07:00`);
        } else if (!rawTo.endsWith('Z') && !rawTo.includes('+') && !rawTo.includes('-', 10)) {
          toDate = new Date(`${rawTo}+07:00`);
        } else {
          toDate = new Date(rawTo);
        }
      }

      const result = await this.listOrdersUseCase.execute({
        storeId,
        status: req.query.status as 'draft' | 'confirmed' | 'cancelled' | undefined,
        customerId: req.query.customerId as string | undefined,
        orderType: req.query.orderType as 'counter' | 'ai_generated' | undefined,
        fromDate,
        toDate,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(result, 'Lấy danh sách đơn hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/:id
   * Returns order with its items.
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getOrderDetailUseCase.execute(req.params.id as string);

      const response = ApiResponse.success(result, 'Lấy chi tiết đơn hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/confirm
   * Confirms a draft order — deducts inventory and updates debt.
   */
  confirmOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AuthenticationError('Yêu cầu xác thực');

      const result = await this.confirmOrderUseCase.execute(req.params.id as string, userId);

      const response = ApiResponse.success(result, 'Xác nhận đơn hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/:id/cancel
   * Cancels a draft order.
   */
  cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Find order
      const order = await this.orderRepo.findById(req.params.id as string);
      if (!order) {
        throw new NotFoundError('Đơn hàng');
      }

      // 2. Validate order is in draft status
      if (!order.isDraft()) {
        throw new ValidationError(
          `Đơn hàng đang ở trạng thái "${order.status}", không thể hủy`,
        );
      }

      // 3. Cancel order
      const cancelledOrder = await this.orderRepo.update(req.params.id as string, {
        status: 'cancelled',
      });

      const response = ApiResponse.success(cancelledOrder, 'Hủy đơn hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/stripe-session
   * Body: { amount: number, orderCode?: string, customerName?: string, items?: Array<{ name: string; quantity: number; unitPrice: number }> }
   */
  createStripeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const { amount, orderCode, customerName, items } = req.body;
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new ValidationError('Số tiền thanh toán qua Stripe không hợp lệ');
      }

      if (!this.stripeGateway) {
        throw new ValidationError('Cổng thanh toán Stripe chưa được cấu hình');
      }

      let storeName = 'BizFlow Store';
      if (this.storeRepo) {
        const store = await this.storeRepo.findById(storeId);
        if (store?.name) storeName = store.name;
      }

      const session = await this.stripeGateway.createOrderCheckoutSession({
        storeId,
        storeName,
        amount,
        orderCode,
        customerName,
        items,
      });

      const response = ApiResponse.success(session, 'Khởi tạo phiên thanh toán Stripe thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/orders/stripe-session/:sessionId/status
   */
  getStripeSessionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.sessionId as string;
      if (!sessionId) {
        throw new ValidationError('Thiếu sessionId phiên Stripe');
      }

      if (!this.stripeGateway) {
        throw new ValidationError('Cổng thanh toán Stripe chưa được cấu hình');
      }

      let session = await this.stripeGateway.retrieveCheckoutSession(sessionId);

      // Bộ đếm 15 phút: Nếu phiên vẫn đang 'open' nhưng đã quá 15 phút kể từ lúc tạo -> Tự động hủy
      const isOver15Minutes = (Date.now() - session.created * 1000) >= 15 * 60 * 1000;
      if (session.status === 'open' && isOver15Minutes) {
        const expiredSession = await this.stripeGateway.expireCheckoutSession(sessionId);
        if (expiredSession) {
          session = expiredSession;
        }
      }

      const isPaid = session.payment_status === 'paid';
      const isExpired = session.status === 'expired' || (session.status !== 'complete' && isOver15Minutes);

      const response = ApiResponse.success(
        {
          sessionId: session.id,
          status: isExpired ? 'expired' : session.status,
          paymentStatus: session.payment_status,
          isPaid,
          isExpired,
          amountTotal: session.amount_total,
          currency: session.currency,
        },
        'Lấy trạng thái phiên thanh toán Stripe thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/orders/stripe-session/:sessionId/cancel
   * Hủy phiên thanh toán Stripe khi hết hạn hoặc người dùng chủ động hủy
   */
  cancelStripeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.sessionId as string;
      if (!sessionId) {
        throw new ValidationError('Thiếu sessionId phiên Stripe');
      }

      if (!this.stripeGateway) {
        throw new ValidationError('Cổng thanh toán Stripe chưa được cấu hình');
      }

      await this.stripeGateway.expireCheckoutSession(sessionId);

      const response = ApiResponse.success(
        {
          sessionId,
          status: 'expired',
          isExpired: true,
        },
        'Đã hủy phiên thanh toán Stripe thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
