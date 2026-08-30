import { Router, Request, Response, NextFunction } from 'express';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { ApiResponse } from '../../../adapters/presenters/ApiResponse.js';
import { AuthenticationError } from '../../../core/errors/AuthenticationError.js';

const router = Router();

// Tất cả route đều yêu cầu xác thực
router.use(authMiddleware);

/**
 * GET /api/v1/stores/me
 * Trả về thông tin cửa hàng hiện tại (bao gồm bank info).
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user?.storeId;
    if (!storeId) throw new AuthenticationError('Store không xác định');

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

export default router;
