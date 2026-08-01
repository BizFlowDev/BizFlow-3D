import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../../config/index.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';

// ── Extend Express Request with user payload ──
export interface JwtPayload {
  userId: string;
  storeId: string | null;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware.
 *
 * - Reads token from `Authorization: Bearer <token>` header.
 * - Verifies JWT signature using `JWT_SECRET`.
 * - Decodes and attaches `{ userId, storeId, role }` to `req.user`.
 * - Returns 401 if token is missing, expired, or invalid.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Token xác thực không được cung cấp'));
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      storeId: decoded.storeId ?? null,
      role: decoded.role,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AuthenticationError('Token đã hết hạn'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AuthenticationError('Token không hợp lệ'));
    }
    return next(new AuthenticationError('Xác thực thất bại'));
  }
}
