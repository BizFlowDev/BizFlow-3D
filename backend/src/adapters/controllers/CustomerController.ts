import type { Request, Response, NextFunction } from 'express';
import { CreateCustomerUseCase } from '../../core/usecases/customer/CreateCustomerUseCase.js';
import { UpdateCustomerUseCase } from '../../core/usecases/customer/UpdateCustomerUseCase.js';
import { ListCustomersUseCase } from '../../core/usecases/customer/ListCustomersUseCase.js';
import { GetCustomerDebtUseCase } from '../../core/usecases/customer/GetCustomerDebtUseCase.js';
import type { ICustomerRepository } from '../../core/repositories/ICustomerRepository.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';
import { NotFoundError } from '../../core/errors/NotFoundError.js';

/**
 * Customer controller.
 * Handles CRUD operations and debt history for customers.
 */
export class CustomerController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly getCustomerDebtUseCase: GetCustomerDebtUseCase,
    private readonly customerRepo: ICustomerRepository,
  ) {}

  /**
   * POST /api/customers
   * Body: { name, phone?, email?, address?, note? }
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.createCustomerUseCase.execute({
        storeId,
        ...req.body,
      });

      const response = ApiResponse.created(result, 'Tạo khách hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/customers/:id
   * Body: { name?, phone?, email?, address?, note?, isActive? }
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.updateCustomerUseCase.execute({
        customerId: req.params.id as string,
        storeId,
        ...req.body,
      });

      const response = ApiResponse.success(result, 'Cập nhật khách hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/customers
   * Query: { isActive?, search?, page?, limit? }
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.listCustomersUseCase.execute({
        storeId,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(result, 'Lấy danh sách khách hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/customers/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customer = await this.customerRepo.findById(req.params.id as string);
      if (!customer) {
        throw new NotFoundError('Khách hàng');
      }

      const response = ApiResponse.success(customer, 'Lấy thông tin khách hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/customers/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const customer = await this.customerRepo.findById(req.params.id as string);
      if (!customer) {
        throw new NotFoundError('Khách hàng');
      }

      if (customer.storeId !== storeId) {
        throw new AuthenticationError('Không có quyền xóa khách hàng này');
      }

      await this.customerRepo.delete(req.params.id as string);

      const response = ApiResponse.success(null, 'Xóa khách hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/customers/:id/debt
   * Returns debt summary and payment history for a customer.
   */
  getDebtHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getCustomerDebtUseCase.execute(req.params.id as string);

      const response = ApiResponse.success(result, 'Lấy lịch sử công nợ thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
