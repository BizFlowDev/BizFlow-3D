import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ApiResponse } from '../presenters/ApiResponse.js';

/**
 * Request body validation middleware factory.
 * Parses `req.body` against the provided Zod schema.
 * - On success: replaces `req.body` with parsed (type-safe) data and calls next().
 * - On failure: responds with 400 and field-level error details.
 *
 * @example
 * router.post('/products', validate(createProductSchema), controller.create);
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      const response = ApiResponse.validationError('Dữ liệu không hợp lệ', errors);
      res.status(response.statusCode).json(response.toJSON());
      return;
    }

    // Replace req.body with parsed data (sanitized & type-coerced)
    req.body = result.data;
    next();
  };
}
