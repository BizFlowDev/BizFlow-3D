import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError.js';
import { ValidationError } from '../../core/errors/ValidationError.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import env from '../../config/index.js';

/**
 * Global Express error handler middleware.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Catches:
 * - `ValidationError` → 400 with field-level details
 * - `AppError` (and subclasses) → appropriate status code
 * - Unknown errors → 500 Internal Server Error
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Validation errors — include field-level details
  if (err instanceof ValidationError) {
    const response = ApiResponse.validationError(err.message, err.fields);
    res.status(response.statusCode).json(response.toJSON());
    return;
  }

  // 2. Known application errors (AppError and subclasses)
  if (err instanceof AppError) {
    const response = ApiResponse.error(err.statusCode, err.message);
    res.status(response.statusCode).json(response.toJSON());
    return;
  }

  // 3. Unknown / unexpected errors
  console.error('[ERROR] Unhandled error:', err);

  const message = env.isDev
    ? `Internal Server Error: ${err.message}`
    : 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

  const response = ApiResponse.error(500, message);

  // In development, include stack trace for debugging
  if (env.isDev) {
    const devResponse = {
      ...response.toJSON(),
      stack: err.stack,
    };
    res.status(500).json(devResponse);
    return;
  }

  res.status(500).json(response.toJSON());
}
