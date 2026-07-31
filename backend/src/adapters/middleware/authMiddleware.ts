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
 * Verifies JWT from `Authorization: Bearer <token>` header
 * and attaches decoded payload to `req.user`.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Token xác thực không được cung cấp');
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token đã hết hạn');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Token không hợp lệ');
    }
    throw new AuthenticationError('Xác thực thất bại');
  }
}
