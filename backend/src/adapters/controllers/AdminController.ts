import type { Request, Response, NextFunction } from 'express';
import { ManageStoreSubscriptionUseCase } from '../../core/usecases/admin/ManageStoreSubscriptionUseCase.js';
import { ToggleStoreStatusUseCase } from '../../core/usecases/admin/ToggleStoreStatusUseCase.js';
import { GetSystemAnalyticsUseCase } from '../../core/usecases/admin/GetSystemAnalyticsUseCase.js';
import { ListStoresUseCase } from '../../core/usecases/admin/ListStoresUseCase.js';
import { GetStoreDetailUseCase } from '../../core/usecases/admin/GetStoreDetailUseCase.js';
import { CreateStoreUseCase } from '../../core/usecases/admin/CreateStoreUseCase.js';
import { ISystemConfigRepository } from '../../core/repositories/ISystemConfigRepository.js';
import { IAnnouncementRepository } from '../../core/repositories/IAnnouncementRepository.js';
import { ITemplateRepository } from '../../core/repositories/ITemplateRepository.js';
import { ISubscriptionPlanRepository } from '../../core/repositories/ISubscriptionPlanRepository.js';
import { ISubscriptionHistoryRepository } from '../../core/repositories/ISubscriptionHistoryRepository.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { ValidationError } from '../../core/errors/ValidationError.js';
import { emitToAll, emitToAllExcept } from '../../frameworks/websocket/socketServer.js';

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
    private readonly createStoreUseCase: CreateStoreUseCase,
    private readonly systemConfigRepo: ISystemConfigRepository,
    private readonly announcementRepo: IAnnouncementRepository,
    private readonly templateRepo: ITemplateRepository,
    private readonly subscriptionPlanRepo: ISubscriptionPlanRepository,
    private readonly subscriptionHistoryRepo: ISubscriptionHistoryRepository,
  ) {}

  /**
   * POST /api/admin/stores
   * Body: { name, address?, phone?, email?, taxCode?, ownerFullName, ownerEmail,
   *         ownerPhone?, ownerPassword, subscriptionPlan?, subscriptionStatus?,
   *         subscriptionExpiresAt? }
   */
  createStore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.createStoreUseCase.execute(req.body);

      const response = ApiResponse.created(result, 'Tạo cửa hàng mới thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/stores
   * Query: { search?, status?, plan?, page?, limit? }
   */
  listStores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.listStoresUseCase.execute({
        search: req.query.search as string | undefined,
        status: req.query.status as 'active' | 'expired' | 'trial' | 'all' | undefined,
        plan: req.query.plan as string | 'all' | undefined,
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

      // Broadcast realtime tới tất cả client đang kết nối (owners/stores),
      // ngoại trừ chính admin đã phát hành thông báo.
      const adminUserId = req.user?.userId;
      const payload = {
        type: 'announcement',
        title,
        message: content,
      };
      if (adminUserId) {
        emitToAllExcept(adminUserId, 'notification', payload);
      } else {
        emitToAll('notification', payload);
      }

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

  // ── Subscription Plans CRUD ────────────────────────────────────────────────

  /**
   * GET /api/admin/subscription-plans
   */
  listSubscriptionPlans = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.subscriptionPlanRepo.findAll();

      const response = ApiResponse.success(result, 'Lấy danh sách gói đăng ký thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/subscription-plans
   * Body: { name, slug, description?, price, features, maxEmployees, ... }
   */
  createSubscriptionPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, slug, description, price, features, maxEmployees, sortOrder, colorFrom, colorTo, icon } = req.body;

      if (!name || !slug || price === undefined || !features || !maxEmployees) {
        throw new ValidationError('name, slug, price, features, maxEmployees là bắt buộc');
      }

      // Check slug uniqueness
      const existing = await this.subscriptionPlanRepo.findBySlug(slug);
      if (existing) {
        throw new ValidationError('Slug đã tồn tại');
      }

      const result = await this.subscriptionPlanRepo.create({
        name,
        slug,
        description,
        price: Number(price),
        features: Array.isArray(features) ? features : [],
        maxEmployees: Number(maxEmployees),
        sortOrder: sortOrder ? Number(sortOrder) : undefined,
        colorFrom,
        colorTo,
        icon,
      });

      const response = ApiResponse.created(result, 'Tạo gói đăng ký thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/subscription-plans/:planId
   * Body: { name?, description?, price?, features?, maxEmployees?, ... }
   */
  updateSubscriptionPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { planId } = req.params;
      const existing = await this.subscriptionPlanRepo.findById(planId as string);
      if (!existing) {
        throw new ValidationError('Gói đăng ký không tồn tại');
      }

      const result = await this.subscriptionPlanRepo.update(planId as string, req.body);

      const response = ApiResponse.success(result, 'Cập nhật gói đăng ký thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/admin/subscription-plans/:planId
   */
  deleteSubscriptionPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { planId } = req.params;
      const existing = await this.subscriptionPlanRepo.findById(planId as string);
      if (!existing) {
        throw new ValidationError('Gói đăng ký không tồn tại');
      }

      if (existing.storeCount && existing.storeCount > 0) {
        throw new ValidationError(`Không thể xoá gói đang có ${existing.storeCount} cửa hàng sử dụng`);
      }

      await this.subscriptionPlanRepo.delete(planId as string);

      const response = ApiResponse.success(null, 'Xoá gói đăng ký thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  // ── Subscription History ──────────────────────────────────────────────────

  /**
   * GET /api/admin/subscription-history
   * Query: { storeId?, page?, limit? }
   */
  listSubscriptionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.subscriptionHistoryRepo.findAll({
        storeId: req.query.storeId as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.success(result, 'Lấy lịch sử đăng ký thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
