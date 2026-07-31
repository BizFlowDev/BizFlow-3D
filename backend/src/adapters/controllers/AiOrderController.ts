import type { Request, Response, NextFunction } from 'express';
import { ProcessNaturalLanguageOrderUseCase } from '../../core/usecases/ai/ProcessNaturalLanguageOrderUseCase.js';
import { GenerateDraftOrderUseCase } from '../../core/usecases/ai/GenerateDraftOrderUseCase.js';
import { ConfirmOrderUseCase } from '../../core/usecases/order/ConfirmOrderUseCase.js';
import type { IOrderRepository } from '../../core/repositories/IOrderRepository.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * AI Order controller.
 * Handles natural language order processing, draft order management, and confirmation.
 */
export class AiOrderController {
  constructor(
    private readonly processNLOrderUseCase: ProcessNaturalLanguageOrderUseCase,
    private readonly generateDraftOrderUseCase: GenerateDraftOrderUseCase,
    private readonly confirmOrderUseCase: ConfirmOrderUseCase,
    private readonly orderRepo: IOrderRepository,
  ) {}

  /**
   * POST /api/ai-orders/process
   * Body: { rawInput }
   * Parses natural language input and matches against store products.
   */
  processNaturalLanguage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const { rawInput } = req.body;
      if (!rawInput || typeof rawInput !== 'string') {
        throw new ValidationError('rawInput là bắt buộc');
      }

      const result = await this.processNLOrderUseCase.execute({
        storeId,
        rawInput,
      });

      const response = ApiResponse.success(result, 'Xử lý đơn hàng AI thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/ai-orders/drafts
   * Returns all AI-generated draft orders for the store.
   */
  getDraftOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.orderRepo.search({
        storeId,
        orderType: 'ai_generated',
        status: 'draft',
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      });

      const response = ApiResponse.paginated(result, 'Lấy danh sách đơn nháp AI thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/ai-orders/:id/confirm
   * Confirms a draft AI-generated order.
   */
  confirmDraftOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AuthenticationError('Yêu cầu xác thực');

      const result = await this.confirmOrderUseCase.execute(req.params.id as string, userId);

      const response = ApiResponse.success(result, 'Xác nhận đơn hàng AI thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
