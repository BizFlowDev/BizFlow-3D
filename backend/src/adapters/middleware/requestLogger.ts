import type { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../../core/entities/AuditLog.js';
import type { IAuditLogRepository } from '../../core/repositories/IAuditLogRepository.js';

/**
 * Request/response logger middleware factory.
 * Logs every authenticated request to the audit_logs table.
 * Uses `res.on('finish')` to capture response status after the handler completes.
 *
 * @param auditLogRepo - Injected audit log repository for persistence
 */
export function requestLogger(auditLogRepo: IAuditLogRepository) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Capture response data after the response is sent
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const user = req.user;

      // Only log authenticated requests to avoid noise
      if (!user) return;

      // Build log entry (fire-and-forget — don't block the response)
      const logEntry = AuditLog.create({
        storeId: user.storeId,
        userId: user.userId,
        action: mapHttpMethodToAction(req.method),
        entityType: 'http_request',
        entityId: crypto.randomUUID(), // Unique request ID
        oldValues: null,
        newValues: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
          userAgent: req.headers['user-agent'] ?? 'unknown',
        },
        ipAddress: req.ip ?? req.socket.remoteAddress ?? null,
      });

      // Fire-and-forget: don't await, just log errors to console
      auditLogRepo.create(logEntry).catch((err) => {
        console.error('[REQUEST_LOGGER] Failed to write audit log:', err);
      });
    });

    next();
  };
}

/** Map HTTP method to audit log action type. */
function mapHttpMethodToAction(method: string): 'create' | 'update' | 'delete' {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'create'; // GET and others default to 'create' for read-audit
  }
}
