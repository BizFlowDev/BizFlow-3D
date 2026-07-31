import { AuditLog } from '../../../core/entities/AuditLog.js';
import { IAuditLogRepository, AuditLogFilter, PaginatedResult } from '../../../core/repositories/IAuditLogRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresAuditLogRepository implements IAuditLogRepository {
  async create(log: AuditLog): Promise<AuditLog> {
    const text = `
      INSERT INTO audit_logs (
        id, store_id, user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      log.id,
      log.storeId,
      log.userId,
      log.action,
      log.entityType,
      log.entityId,
      log.oldValues,
      log.newValues,
      log.ipAddress,
      log.createdAt,
    ];
    
    const res = await query(text, values);
    return AuditLog.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async findByEntityId(entityType: string, entityId: string): Promise<AuditLog[]> {
    const res = await query(
      'SELECT * FROM audit_logs WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC',
      [entityType, entityId]
    );
    return res.rows.map(row => AuditLog.fromPersistence(mapToCamelCase(row)));
  }

  private buildFilterQuery(baseConditions: string[], params: any[], filter?: AuditLogFilter) {
    let idx = params.length + 1;
    
    if (filter) {
      if (filter.storeId) {
        baseConditions.push(`store_id = $${idx++}`);
        params.push(filter.storeId);
      }
      if (filter.userId) {
        baseConditions.push(`user_id = $${idx++}`);
        params.push(filter.userId);
      }
      if (filter.action) {
        baseConditions.push(`action = $${idx++}`);
        params.push(filter.action);
      }
      if (filter.entityType) {
        baseConditions.push(`entity_type = $${idx++}`);
        params.push(filter.entityType);
      }
      if (filter.fromDate) {
        baseConditions.push(`created_at >= $${idx++}`);
        params.push(filter.fromDate);
      }
      if (filter.toDate) {
        baseConditions.push(`created_at <= $${idx++}`);
        params.push(filter.toDate);
      }
    }
    
    return { conditions: baseConditions, params, idx };
  }

  async findByStoreId(storeId: string, filter?: AuditLogFilter): Promise<PaginatedResult<AuditLog>> {
    const { conditions, params, idx } = this.buildFilterQuery(['store_id = $1'], [storeId], filter);
    return this.executeQuery(conditions, params, idx, filter?.page, filter?.limit);
  }

  async findByUserId(userId: string, filter?: AuditLogFilter): Promise<PaginatedResult<AuditLog>> {
    const { conditions, params, idx } = this.buildFilterQuery(['user_id = $1'], [userId], filter);
    return this.executeQuery(conditions, params, idx, filter?.page, filter?.limit);
  }

  private async executeQuery(
    conditions: string[], 
    params: any[], 
    idx: number, 
    pageParam?: number, 
    limitParam?: number
  ): Promise<PaginatedResult<AuditLog>> {
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const countRes = await query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const page = pageParam || 1;
    const limit = limitParam || 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const data = dataRes.rows.map(row => AuditLog.fromPersistence(mapToCamelCase(row)));

    return { data, total, page, limit };
  }
}
