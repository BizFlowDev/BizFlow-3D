import type { Request, Response, NextFunction } from 'express';
import { GenerateFinancialReportUseCase, ReportType } from '../../core/usecases/accounting/GenerateFinancialReportUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

const REPORT_TYPES: ReportType[] = ['revenue_ledger', 'debt_report', 'business_result', 'trial_balance'];

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
   * Query: { reportType, fromDate, toDate }
   * Generates a financial report (revenue ledger, debt, business result, trial balance).
   */
  getFinancialReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const reportType = req.query.reportType as string | undefined;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      if (!reportType) {
        throw new ValidationError('reportType là bắt buộc');
      }
      if (!REPORT_TYPES.includes(reportType as ReportType)) {
        throw new ValidationError(
          `reportType không hợp lệ. Chấp nhận: ${REPORT_TYPES.join(', ')}`,
        );
      }
      if (!fromDate || !toDate) {
        throw new ValidationError('fromDate và toDate là bắt buộc');
      }

      let from: Date;
      let to: Date;

      if (fromDate.length === 10) {
        from = new Date(`${fromDate}T00:00:00+07:00`);
      } else {
        from = new Date(fromDate);
      }

      if (toDate.length === 10) {
        to = new Date(`${toDate}T23:59:59.999+07:00`);
      } else {
        to = new Date(toDate);
      }

      const result = await this.generateFinancialReportUseCase.execute(
        storeId,
        reportType as ReportType,
        from,
        to,
      );

      const response = ApiResponse.success(result, 'Tạo báo cáo tài chính thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
