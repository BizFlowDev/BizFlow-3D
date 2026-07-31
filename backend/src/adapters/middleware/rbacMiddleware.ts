import type { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../../core/errors/AuthorizationError.js';

/**
 * Role-based access control middleware factory.
 * Returns a middleware that checks if `req.user.role` is in the allowed list.
 *
 * @example
 * router.get('/admin', authMiddleware, allowRoles('admin'), handler);
 * router.post('/products', authMiddleware, allowRoles('owner', 'employee'), handler);
 */
export function allowRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      throw new AuthorizationError('Yêu cầu xác thực trước khi kiểm tra quyền');
    }

    if (!roles.includes(user.role)) {
      throw new AuthorizationError(
        `Vai trò "${user.role}" không có quyền truy cập. Yêu cầu: ${roles.join(', ')}`,
      );
    }

    next();
  };
}
