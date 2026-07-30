import { AuditLog } from '../entities/AuditLog.js';

export interface AuditLogFilter {
  storeId?: string;
  userId?: string;
  action?: 'create' | 'update' | 'delete';
  entityType?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IAuditLogRepository {
  create(log: AuditLog): Promise<AuditLog>;
  findByEntityId(entityType: string, entityId: string): Promise<AuditLog[]>;
  findByStoreId(storeId: string, filter?: AuditLogFilter): Promise<PaginatedResult<AuditLog>>;
  findByUserId(userId: string, filter?: AuditLogFilter): Promise<PaginatedResult<AuditLog>>;
}
