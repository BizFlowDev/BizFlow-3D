import type { Request, Response, NextFunction } from 'express';
import { ManageStoreSubscriptionUseCase } from '../../core/usecases/admin/ManageStoreSubscriptionUseCase.js';
import { ToggleStoreStatusUseCase } from '../../core/usecases/admin/ToggleStoreStatusUseCase.js';
import { GetSystemAnalyticsUseCase } from '../../core/usecases/admin/GetSystemAnalyticsUseCase.js';
import { ListStoresUseCase } from '../../core/usecases/admin/ListStoresUseCase.js';
import { GetStoreDetailUseCase } from '../../core/usecases/admin/GetStoreDetailUseCase.js';
import { ISystemConfigRepository } from '../../core/repositories/ISystemConfigRepository.js';
import { IAnnouncementRepository } from '../../core/repositories/IAnnouncementRepository.js';
import { ITemplateRepository } from '../../core/repositories/ITemplateRepository.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { ValidationError } from '../../core/errors/ValidationError.js';

/**
 * Admin controller.
 * System-level operations accessible only to admin users.
 */
export class AdminController {
  constructor(
    private readonly manageStoreSubscriptionUseCase: ManageStoreSubscriptionUseCase,
    private readonly toggleStoreStatusUseCase: ToggleStoreStatusUseCase,
    private readonly getSystemAnalyticsUseCase: GetSystemAnalyticsUseCase,
    private readonly listStoresUseCase: ListStoresUseCase,
    private readonly getStoreDetailUseCase: GetStoreDetailUseCase,
    private readonly systemConfigRepo: ISystemConfigRepository,
    private readonly announcementRepo: IAnnouncementRepository,
    private readonly templateRepo: ITemplateRepository,
  ) {}

  /**
   * GET /api/admin/stores
   * Query: { search?, status?, plan?, page?, limit? }
   */
  listStores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listStoresUseCase.execute({
        search: req.query.search as string | undefined,
        status: req.query.status as 'active' | 'expired' | 'trial' | 'all' | undefined,
        plan: req.query.plan as 'basic' | 'professional' | 'all' | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(result, 'Lấy danh sách cửa hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/stores/:storeId
   */
  getStoreById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getStoreDetailUseCase.execute(req.params.storeId as string);

      const response = ApiResponse.success(result, 'Lấy chi tiết cửa hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/stores/:storeId/subscription
   * Body: { plan, price?, durationMonths }
   */
  manageStores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.manageStoreSubscriptionUseCase.execute({
        storeId: req.params.storeId as string,
        ...req.body,
      });

      const response = ApiResponse.success(result, 'Cập nhật gói dịch vụ thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/admin/stores/:storeId/status
   * Body: { activate: boolean }
   */
  toggleStoreStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.toggleStoreStatusUseCase.execute({
        storeId: req.params.storeId as string,
        activate: req.body.activate,
      });

      const response = ApiResponse.success(result, 'Cập nhật trạng thái cửa hàng thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/system-config
   */
  listSystemConfig = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.systemConfigRepo.findAll();

      const response = ApiResponse.success(result, 'Lấy cấu hình hệ thống thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/system-config
   * Body: { configs: [{ key, value }] }
   */
  updateSystemConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { configs } = req.body;

      if (!Array.isArray(configs) || configs.length === 0) {
        throw new ValidationError('configs là mảng bắt buộc');
      }

      const updatedBy = req.user?.userId ?? null;
      for (const config of configs) {
        if (!config?.key || config.value === undefined) {
          throw new ValidationError('key và value là bắt buộc cho mỗi cấu hình');
        }
        await this.systemConfigRepo.upsert(config.key, String(config.value), updatedBy);
      }

      const result = await this.systemConfigRepo.findAll();
      const response = ApiResponse.success(result, 'Cập nhật cấu hình hệ thống thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/announcements
   */
  listAnnouncements = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.announcementRepo.findAll();

      const response = ApiResponse.success(result, 'Lấy danh sách thông báo thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/announcements
   * Body: { title, content }
   */
  createAnnouncement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        throw new ValidationError('title và content là bắt buộc');
      }

      const result = await this.announcementRepo.create({
        title,
        content,
        createdBy: req.user?.userId ?? null,
      });

      const response = ApiResponse.created(result, 'Gửi thông báo thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/templates
   */
  listTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.templateRepo.findAll();

      const response = ApiResponse.success(result, 'Lấy danh sách mẫu báo cáo thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/templates (multipart/form-data, field "template")
   * Uploads a new report template file.
   */
  uploadTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        throw new ValidationError('File mẫu báo cáo không được cung cấp');
      }

      const name = (req.body.name as string) || file.originalname;
      const result = await this.templateRepo.create({
        name,
        version: (req.body.version as string) || 'v1.0',
        fileUrl: `/uploads/report-templates/${file.filename}`,
        updatedBy: req.user?.userId ?? null,
      });

      const response = ApiResponse.created(
        { ...result, url: result.fileUrl },
        'Upload mẫu báo cáo thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/analytics
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
}
