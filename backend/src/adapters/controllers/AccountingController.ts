import type { Request, Response, NextFunction } from 'express';
import { GenerateFinancialReportUseCase } from '../../core/usecases/accounting/GenerateFinancialReportUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * Accounting controller.
 * Handles financial report generation (Thông tư 88/2021/TT-BTC).
 */
export class AccountingController {
  constructor(
    private readonly generateFinancialReportUseCase: GenerateFinancialReportUseCase,
  ) {}

  /**
   * GET /api/accounting/financial-report
   * Query: { fromDate, toDate }
   * Generates a comprehensive financial report for the store.
   */
  getFinancialReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      if (!fromDate || !toDate) {
        throw new ValidationError('fromDate và toDate là bắt buộc');
      }

      const result = await this.generateFinancialReportUseCase.execute(
        storeId,
        new Date(fromDate),
        new Date(toDate),
      );

      const response = ApiResponse.success(result, 'Tạo báo cáo tài chính thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
