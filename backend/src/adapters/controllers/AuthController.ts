import type { Request, Response, NextFunction } from 'express';
import { LoginUseCase } from '../../core/usecases/auth/LoginUseCase.js';
import { RegisterStoreUseCase } from '../../core/usecases/auth/RegisterStoreUseCase.js';
import type { IUserRepository } from '../../core/repositories/IUserRepository.js';
import type { IPasswordHasher as IPasswordComparer } from '../../core/usecases/auth/LoginUseCase.js';
import type { IPasswordHasher as IPasswordHasherFull } from '../../core/usecases/auth/RegisterStoreUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/** Combined interface for change-password: needs both compare and hash. */
export interface IPasswordService extends IPasswordComparer, IPasswordHasherFull {}

/**
 * Authentication controller.
 * Handles login, store registration, and password change.
 */
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerStoreUseCase: RegisterStoreUseCase,
    private readonly userRepo: IUserRepository,
    private readonly passwordService: IPasswordService,
  ) {}

  /**
   * POST /api/auth/login
   * Body: { email, password }
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUseCase.execute({
        email: req.body.email,
        password: req.body.password,
      });

      const response = ApiResponse.success(result, 'Đăng nhập thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/register
   * Body: { storeName, ownerFullName, ownerEmail, ownerPassword, ... }
   */
  registerStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.registerStoreUseCase.execute(req.body);

      const response = ApiResponse.created(
        {
          store: result.store,
          owner: {
            id: result.owner.id,
            fullName: result.owner.fullName,
            email: result.owner.email,
            role: result.owner.role,
          },
        },
        'Đăng ký cửa hàng thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/auth/change-password
   * Body: { currentPassword, newPassword, confirmPassword }
   * Requires: authMiddleware
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AuthenticationError('Yêu cầu xác thực');
      }

      const { currentPassword, newPassword } = req.body;

      // 1. Find user
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new AuthenticationError('Người dùng không tồn tại');
      }

      // 2. Verify current password
      const isValid = await this.passwordService.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new ValidationError('Mật khẩu hiện tại không đúng');
      }

      // 3. Hash and update new password
      const newHash = await this.passwordService.hash(newPassword);
      await this.userRepo.update(userId, { passwordHash: newHash });

      const response = ApiResponse.success(null, 'Đổi mật khẩu thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
