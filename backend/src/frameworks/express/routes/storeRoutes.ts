import { Router, Request, Response, NextFunction } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { ApiResponse } from '../../../adapters/presenters/ApiResponse.js';
import { AuthenticationError } from '../../../core/errors/AuthenticationError.js';

const router = Router();

// Tất cả route đều yêu cầu xác thực
router.use(authMiddleware);

async function getEffectiveStoreId(req: Request): Promise<string> {
  let storeId = req.user?.storeId;
  if (!storeId && req.user?.role === 'admin') {
    if (req.body?.storeId) {
      return String(req.body.storeId);
    }
    const storeResult = await controllers.storeRepo.searchAdmin({ limit: 1 });
    if (storeResult.data.length > 0) {
      return storeResult.data[0].id;
    }
  }
  if (!storeId) {
    throw new AuthenticationError('Store không xác định');
  }
  return storeId;
}

/**
 * GET /api/v1/stores/me
 * Trả về thông tin cửa hàng hiện tại (bao gồm bank info).
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await getEffectiveStoreId(req);
    const store = await controllers.storeRepo.findById(storeId);
    if (!store) throw new AuthenticationError('Store không tồn tại');

    const response = ApiResponse.success(store, 'Lấy thông tin cửa hàng thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/stores/bank-info
 * Cập nhật thông tin ngân hàng nhận tiền (VietQR).
 * Body: { bankCode, bankAccountNumber, bankAccountHolder }
 */
router.put('/bank-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) throw new AuthenticationError('Store không xác định');

    const { bankCode, bankAccountNumber, bankAccountHolder } = req.body;

    const store = await controllers.storeRepo.update(storeId, {
      bankCode: bankCode ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankAccountHolder: bankAccountHolder ?? null,
    });

    const response = ApiResponse.success(store, 'Cập nhật thông tin ngân hàng thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/stores/profile
 * Cập nhật thông tin chung của cửa hàng (Tên, địa chỉ, sđt, email, taxCode).
 */
router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) throw new AuthenticationError('Store không xác định');

    const { name, address, phone, email, taxCode } = req.body;

    const store = await controllers.storeRepo.update(storeId, {
      name,
      address: address ?? null,
      phone: phone ?? null,
      email: email ?? null,
      taxCode: taxCode ?? null,
    });

    const response = ApiResponse.success(store, 'Cập nhật thông tin cửa hàng thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stores/subscription-plans
 * Trả về danh sách các gói dịch vụ đang hoạt động.
 */
router.get('/subscription-plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await controllers.subscriptionPlanRepo.findAll();
    const activePlans = plans.filter((p) => p.isActive);
    const response = ApiResponse.success(activePlans, 'Lấy danh sách gói dịch vụ thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stores/subscription-payment-bank
 * Trả về thông tin tài khoản ngân hàng nhận tiền bản quyền/gói dịch vụ do Admin cấu hình.
 */
router.get('/subscription-payment-bank', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const bankCodeConfig = await controllers.systemConfigRepo.findByKey('payment.bank_code');
    const accountNumConfig = await controllers.systemConfigRepo.findByKey('payment.bank_account_number');
    const accountHolderConfig = await controllers.systemConfigRepo.findByKey('payment.bank_account_holder');
    const memoPrefixConfig = await controllers.systemConfigRepo.findByKey('payment.bank_memo_prefix');

    const paymentBank = {
      bankCode: bankCodeConfig?.value || 'MB',
      accountNumber: accountNumConfig?.value || '099988889999',
      accountHolder: accountHolderConfig?.value || 'CONG TY CONG NGHE BIZFLOW',
      memoPrefix: memoPrefixConfig?.value || 'UPGRADE',
    };

    const response = ApiResponse.success(paymentBank, 'Lấy thông tin tài khoản thanh toán thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/stores/upgrade-subscription
 * Nâng cấp / gia hạn gói dịch vụ cho cửa hàng hiện tại.
 * Body: { plan: string, durationMonths: number, paymentMethod?: string }
 */
router.post('/upgrade-subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await getEffectiveStoreId(req);

    const { plan, durationMonths = 1, paymentMethod = 'vietqr' } = req.body;
    if (!plan) {
      throw new Error('Vui lòng chọn gói dịch vụ');
    }

    const currentStore = await controllers.storeRepo.findById(storeId);
    if (!currentStore) throw new AuthenticationError('Store không tồn tại');

    const updatedStore = await controllers.manageStoreSubscriptionUseCase.execute({
      storeId,
      plan,
      durationMonths: Number(durationMonths) || 1,
    });

    // Ghi nhận lịch sử chuyển đổi gói
    await controllers.subscriptionHistoryRepo.create({
      storeId,
      storeName: currentStore.name,
      oldPlan: currentStore.subscriptionPlan,
      newPlan: plan,
      oldStatus: currentStore.subscriptionStatus,
      newStatus: 'active',
      changedBy: req.user?.userId,
      changedByName: req.user?.role === 'admin' ? 'Quản trị viên' : 'Chủ cửa hàng',
      note: `Nâng cấp gói qua thanh toán ${paymentMethod.toUpperCase()}`,
    });

    const response = ApiResponse.success(updatedStore, 'Nâng cấp gói dịch vụ thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/stores/upgrade-session/stripe
 * Tạo phiên thanh toán nâng cấp gói qua Stripe Checkout và sinh mã QR
 */
router.post('/upgrade-session/stripe', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await getEffectiveStoreId(req);

    const { plan, durationMonths = 1 } = req.body;
    if (!plan) {
      throw new Error('Vui lòng chọn gói dịch vụ');
    }

    const sessionData = await controllers.createStripeUpgradeSessionUseCase.execute({
      storeId,
      planSlug: plan,
      durationMonths: Number(durationMonths) || 1,
      userEmail: (req.user as any)?.email,
    });

    const response = ApiResponse.success(sessionData, 'Tạo phiên thanh toán Stripe thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/stores/subscription-orders/:orderId/status
 * Kiểm tra trạng thái đơn nâng cấp gói (phục vụ fallback polling)
 */
router.get('/subscription-orders/:orderId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await getEffectiveStoreId(req);

    const orderId = String(req.params.orderId);
    const orderData = await controllers.getSubscriptionOrderStatusUseCase.execute(orderId, storeId);

    const response = ApiResponse.success(orderData, 'Lấy trạng thái đơn hàng thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/stores/subscription-orders/:orderId/cancel
 * Hủy đơn hàng đăng ký gói (và hủy phiên Stripe) khi hết hạn 15 phút hoặc người dùng chủ động hủy
 */
router.post('/subscription-orders/:orderId/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = await getEffectiveStoreId(req);
    const orderId = String(req.params.orderId);
    const order = await controllers.subscriptionOrderRepo.findById(orderId);
    if (!order) {
      const response = ApiResponse.success({ orderId, status: 'cancelled' }, 'Đã xử lý hủy đơn hàng');
      res.status(response.statusCode).json(response.toJSON());
      return;
    }

    if (order.status === 'pending') {
      if (order.stripeSessionId && controllers.stripeGateway) {
        await controllers.stripeGateway.expireCheckoutSession(order.stripeSessionId);
      }
      await controllers.subscriptionOrderRepo.updateStatus(orderId, 'cancelled');
    }

    const response = ApiResponse.success({ orderId, status: 'cancelled' }, 'Đã hủy đơn hàng thành công');
    res.status(response.statusCode).json(response.toJSON());
  } catch (error) {
    next(error);
  }
});

export default router;

