import { reportPeriod } from '../../core/usecases/accounting/reportPeriod.js';
import { AccountingReconciliationService } from '../../frameworks/database/AccountingReconciliationService.js';
import type { Request, Response, NextFunction } from 'express';
import { GenerateFinancialReportUseCase, ReportType } from '../../core/usecases/accounting/GenerateFinancialReportUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

const REPORT_TYPES: ReportType[] = ['revenue_ledger', 'debt_report', 'business_result', 'trial_balance'];

/**
 * Accounting controller.
 * Handles financial report generation (báo cáo quản trị nội bộ).
 */
export class AccountingController {
  constructor(
    private readonly generateFinancialReportUseCase: GenerateFinancialReportUseCase,
    private readonly reconciliation = new AccountingReconciliationService(),
  ) {}

  previewReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.storeId) throw new AuthenticationError('Store không xác định');
      const result = await this.reconciliation.preview(req.user.storeId);
      const response = ApiResponse.success(result, 'Đã kiểm tra dữ liệu đối soát');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) { next(error); }
  };

  applyReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.storeId) throw new AuthenticationError('Store không xác định');
      if (typeof req.body.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(req.body.fingerprint)) throw new ValidationError('Vui lòng xem trước đối soát trước khi áp dụng');
      const result = await this.reconciliation.apply(req.user.storeId, req.body.fingerprint, req.user.userId);
      const response = ApiResponse.success(result, 'Đã xử lý các phần có đủ căn cứ và lưu lịch sử đối soát');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) { next(error); }
  };

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

      const { from, to } = reportPeriod(fromDate, toDate);

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
