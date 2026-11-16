import type { Request, Response, NextFunction } from 'express';
import { RecordDebtPaymentUseCase } from '../../core/usecases/debt/RecordDebtPaymentUseCase.js';
import { GetDebtSummaryUseCase } from '../../core/usecases/report/GetDebtSummaryUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';

/**
 * Debt controller.
 * Handles debt payment recording and debt summary retrieval.
 */
export class DebtController {
  constructor(
    private readonly recordDebtPaymentUseCase: RecordDebtPaymentUseCase,
    private readonly getDebtSummaryUseCase: GetDebtSummaryUseCase,
  ) {}

  /**
   * POST /api/debts/payment
   * Body: { customerId, amount, paymentMethod, orderId?, note? }
   */
  recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.recordDebtPaymentUseCase.execute({
        ...req.body,
        storeId,
        createdBy: req.user?.userId,
      });

      const response = ApiResponse.created(result, 'Ghi nhận thanh toán công nợ thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/debts/summary
   * Returns debt summary for all customers in the store.
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
}
