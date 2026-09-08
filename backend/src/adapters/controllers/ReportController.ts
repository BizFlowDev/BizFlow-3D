import type { Request, Response, NextFunction } from 'express';
import { GetDailyRevenueUseCase } from '../../core/usecases/report/GetDailyRevenueUseCase.js';
import { GetTopProductsUseCase } from '../../core/usecases/report/GetTopProductsUseCase.js';
import { GetDebtSummaryUseCase } from '../../core/usecases/report/GetDebtSummaryUseCase.js';
import { GetRevenueByCategoryUseCase } from '../../core/usecases/report/GetRevenueByCategoryUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * Report controller.
 * Handles business intelligence queries: revenue, top products, debt summary, revenue by category.
 */
export class ReportController {
  constructor(
    private readonly getDailyRevenueUseCase: GetDailyRevenueUseCase,
    private readonly getTopProductsUseCase: GetTopProductsUseCase,
    private readonly getDebtSummaryUseCase: GetDebtSummaryUseCase,
    private readonly getRevenueByCategoryUseCase: GetRevenueByCategoryUseCase,
  ) {}

  /**
   * GET /api/reports/daily-revenue
   * Query: { fromDate, toDate }
   */
  getDailyRevenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      if (!fromDate || !toDate) {
        throw new ValidationError('fromDate và toDate là bắt buộc');
      }

      const result = await this.getDailyRevenueUseCase.execute({
        storeId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });

      const response = ApiResponse.success(result, 'Lấy báo cáo doanh thu thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/reports/top-products
   * Query: { limit? }
   */
  getTopProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await this.getTopProductsUseCase.execute(storeId, limit);

      const response = ApiResponse.success(result, 'Lấy sản phẩm bán chạy thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/reports/debt-summary
   */
  getDebtSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.getDebtSummaryUseCase.execute(storeId);

      const response = ApiResponse.success(result, 'Lấy tổng hợp công nợ thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/reports/revenue-by-category
   */
  getRevenueByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.getRevenueByCategoryUseCase.execute(storeId);

      const response = ApiResponse.success(result, 'Lấy doanh thu theo danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
