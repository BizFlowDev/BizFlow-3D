import type { Request, Response, NextFunction } from 'express';
import { ManageStoreSubscriptionUseCase } from '../../core/usecases/admin/ManageStoreSubscriptionUseCase.js';
import { GetSystemAnalyticsUseCase } from '../../core/usecases/admin/GetSystemAnalyticsUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * Admin controller.
 * System-level operations accessible only to admin users.
 * Handles store subscription management, system analytics, and system config.
 */
export class AdminController {
  constructor(
    private readonly manageStoreSubscriptionUseCase: ManageStoreSubscriptionUseCase,
    private readonly getSystemAnalyticsUseCase: GetSystemAnalyticsUseCase,
  ) {}

  /**
   * PUT /api/admin/stores/:storeId/subscription
   * Body: { subscriptionPlan, subscriptionStatus, subscriptionExpiresAt? }
   * Updates a store's subscription plan.
   */
  manageStores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.params.storeId as string;

      const result = await this.manageStoreSubscriptionUseCase.execute({
        storeId,
        ...req.body,
      });

      const response = ApiResponse.success(result, 'Cập nhật gói dịch vụ thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/analytics
   * Returns system-wide analytics: total stores, users, orders, etc.
   */
  getSystemAnalytics = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getSystemAnalyticsUseCase.execute();

      const response = ApiResponse.success(result, 'Lấy thống kê hệ thống thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/system-config
   * Body: { key, value }
   * Placeholder for future system configuration management.
   */
  updateSystemConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { key, value } = req.body;

      if (!key || value === undefined) {
        throw new ValidationError('key và value là bắt buộc');
      }

      // Placeholder: In a real implementation, this would update a system config table
      // or environment-specific settings store.
      const result = {
        key,
        value,
        updatedAt: new Date(),
        message: 'Tính năng sẽ được triển khai trong phiên bản tiếp theo',
      };

      const response = ApiResponse.success(result, 'Cập nhật cấu hình hệ thống thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
