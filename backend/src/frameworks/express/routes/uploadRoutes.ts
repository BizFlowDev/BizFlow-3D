import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';
import { cloudinaryService } from '../../services/CloudinaryService.js';
import { ApiResponse } from '../../../adapters/presenters/ApiResponse.js';
import { ValidationError } from '../../../core/errors/ValidationError.js';

const router = Router();

// ── Multer in-memory storage (không lưu file tạm ra ổ đĩa) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh định dạng JPEG, PNG, WEBP hoặc GIF'));
    }
  },
});

// Tất cả route upload đều yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * POST /api/v1/upload/image
 * Tải ảnh sản phẩm lên Cloudinary
 */
router.post(
  '/image',
  allowRoles('owner', 'manager'),
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ValidationError('Dung lượng ảnh không được vượt quá 5MB'));
        }
        return next(new ValidationError(`Lỗi tải file: ${err.message}`));
      } else if (err instanceof Error) {
        return next(new ValidationError(err.message));
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new ValidationError('Vui lòng chọn file ảnh để tải lên');
      }

      const storeId = req.user?.storeId || 'common';
      const folder = `bizflow/stores/${storeId}/products`;

      const result = await cloudinaryService.uploadImage(req.file.buffer, {
        folder,
      });

      const response = ApiResponse.success(result, 'Tải ảnh lên Cloudinary thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  },
);

/**
 * DELETE /api/v1/upload/image
 * Xóa ảnh trên Cloudinary theo publicId
 */
router.delete(
  '/image',
  allowRoles('owner', 'manager'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { publicId } = req.body;
      if (!publicId || typeof publicId !== 'string') {
        throw new ValidationError('Vui lòng cung cấp publicId của ảnh cần xóa');
      }

      await cloudinaryService.deleteImage(publicId);

      const response = ApiResponse.success(null, 'Xoá ảnh thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  },
);

export default router;
