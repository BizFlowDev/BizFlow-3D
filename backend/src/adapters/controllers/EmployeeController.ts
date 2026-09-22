import type { Request, Response, NextFunction } from 'express';
import { ListEmployeesUseCase } from '../../core/usecases/employee/ListEmployeesUseCase.js';
import { CreateEmployeeUseCase } from '../../core/usecases/employee/CreateEmployeeUseCase.js';
import { ToggleEmployeeStatusUseCase } from '../../core/usecases/employee/ToggleEmployeeStatusUseCase.js';
import { ResetEmployeePasswordUseCase } from '../../core/usecases/employee/ResetEmployeePasswordUseCase.js';
import type { IUserRepository } from '../../core/repositories/IUserRepository.js';
import type { IAuditLogRepository } from '../../core/repositories/IAuditLogRepository.js';
import { AuditLog } from '../../core/entities/AuditLog.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';

/** Response DTO — không expose passwordHash. */
interface EmployeeDTO {
  id: string;
  storeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDTO(user: {
  id: string;
  storeId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): EmployeeDTO {
  return {
    id: user.id,
    storeId: user.storeId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Employee controller.
 * Handles employee CRUD, status toggle, password reset, and audit log queries.
 */
export class EmployeeController {
  constructor(
    private readonly listEmployeesUseCase: ListEmployeesUseCase,
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly toggleEmployeeStatusUseCase: ToggleEmployeeStatusUseCase,
    private readonly resetEmployeePasswordUseCase: ResetEmployeePasswordUseCase,
    private readonly userRepo: IUserRepository,
    private readonly auditLogRepo: IAuditLogRepository,
  ) {}

  /** Ghi audit log nghiệp vụ (fire-and-forget, không chặn response). */
  private writeAudit(params: {
    storeId: string | null;
    userId: string | null;
    action: 'create' | 'update' | 'delete';
    entityType: string;
    entityId: string;
    newValues: Record<string, unknown>;
    req: Request;
  }) {
    const log = AuditLog.create({
      storeId: params.storeId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: null,
      newValues: params.newValues,
      ipAddress: params.req.ip ?? params.req.socket.remoteAddress ?? null,
    });
    this.auditLogRepo.create(log).catch((err) => {
      console.error('[EMPLOYEE_AUDIT] Failed to write audit log:', err);
    });
  }

  /**
   * GET /api/v1/employees
   * Query: { search?, page?, limit? }
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.listEmployeesUseCase.execute({
        storeId,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(
        { ...result, data: result.data.map(toDTO) },
        'Lấy danh sách nhân viên thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/employees
   * Body: { fullName, email, phone?, password, sendEmail? }
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const employee = await this.createEmployeeUseCase.execute({
        storeId,
        ...req.body,
      });

      this.writeAudit({
        storeId,
        userId: req.user?.userId ?? null,
        action: 'create',
        entityType: 'employee',
        entityId: employee.id,
        newValues: {
          event: 'employee_created',
          fullName: employee.fullName,
          email: employee.email,
        },
        req,
      });

      const response = ApiResponse.created(
        { success: true, employee: toDTO(employee) },
        'Tạo nhân viên thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/employees/:id/status
   * Body: { activate: boolean }
   */
  toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const employee = await this.toggleEmployeeStatusUseCase.execute({
        employeeId: req.params.id as string,
        storeId,
        activate: req.body.activate === true,
      });

      this.writeAudit({
        storeId,
        userId: req.user?.userId ?? null,
        action: 'update',
        entityType: 'employee',
        entityId: employee.id,
        newValues: {
          event: employee.isActive ? 'status_activated' : 'status_deactivated',
          fullName: employee.fullName,
        },
        req,
      });

      const response = ApiResponse.success(
        { success: true, isActive: employee.isActive },
        employee.isActive ? 'Kích hoạt tài khoản thành công' : 'Vô hiệu hóa tài khoản thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/employees/:id/reset-password
   * Body: { newPassword }
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const employee = await this.resetEmployeePasswordUseCase.execute({
        employeeId: req.params.id as string,
        storeId,
        newPassword: req.body.newPassword,
      });

      this.writeAudit({
        storeId,
        userId: req.user?.userId ?? null,
        action: 'update',
        entityType: 'employee',
        entityId: employee.id,
        newValues: { event: 'password_reset', fullName: employee.fullName },
        req,
      });

      const response = ApiResponse.success(
        { success: true },
        'Đặt lại mật khẩu thành công',
      );
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/employees/:id/audit-log
   * Trả về timeline các thay đổi nghiệp vụ của 1 nhân viên.
   */
  getAuditLog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const employee = await this.userRepo.findById(req.params.id as string);
      if (!employee || !employee.belongsToStore(storeId)) {
        const response = ApiResponse.success([], 'Không có lịch sử thay đổi');
        res.status(response.statusCode).json(response.toJSON());
        return;
      }

      const logs = await this.auditLogRepo.findByEntityId('employee', employee.id);

      // Lấy tên người thực hiện
      const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
      const users = await Promise.all(userIds.map((id) => this.userRepo.findById(id)));
      const nameMap = new Map<string, string>();
      users.forEach((u) => {
        if (u) nameMap.set(u.id, u.fullName);
      });

      const items = logs
        .filter((l) => l.newValues && typeof l.newValues.event === 'string')
        .map((l) => ({
          id: l.id,
          userId: l.userId,
          action: (l.newValues as Record<string, unknown>).event as string,
          performedBy: l.userId,
          performedByName: nameMap.get(l.userId ?? '') ?? 'Hệ thống',
          details: this.buildDetails(
            (l.newValues as Record<string, unknown>).event as string,
            l.newValues as Record<string, unknown>,
          ),
          createdAt: l.createdAt.toISOString(),
        }))
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

      const response = ApiResponse.success(items, 'Lấy lịch sử thay đổi thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  private buildDetails(
    event: string,
    values: Record<string, unknown>,
  ): string {
    const fullName = typeof values.fullName === 'string' ? values.fullName : '';
    switch (event) {
      case 'employee_created': {
        const email = typeof values.email === 'string' ? values.email : '';
        return `Tạo tài khoản nhân viên ${fullName} (${email})`;
      }
      case 'status_deactivated':
        return 'Vô hiệu hóa tài khoản nhân viên';
      case 'status_activated':
        return 'Kích hoạt lại tài khoản nhân viên';
      case 'password_reset':
        return 'Đặt lại mật khẩu tài khoản';
      default:
        return `Cập nhật tài khoản nhân viên ${fullName}`.trim();
    }
  }
}
