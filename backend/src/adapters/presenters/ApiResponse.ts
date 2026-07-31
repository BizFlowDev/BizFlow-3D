import type { FieldError } from '../../core/errors/ValidationError.js';

/**
 * Standardized API response wrapper.
 * All controllers return this shape to ensure consistent API contract.
 */
export class ApiResponse<T = unknown> {
  readonly statusCode: number;
  readonly success: boolean;
  readonly data?: T;
  readonly message: string;
  readonly errors?: FieldError[];

  private constructor(params: {
    statusCode: number;
    success: boolean;
    message: string;
    data?: T;
    errors?: FieldError[];
  }) {
    this.statusCode = params.statusCode;
    this.success = params.success;
    this.message = params.message;
    this.data = params.data;
    this.errors = params.errors;
  }

  // ── Factory Methods ──────────────────────────────────────

  /** 200 OK — generic success response. */
  static success<T>(data: T, message: string = 'Thành công'): ApiResponse<T> {
    return new ApiResponse({ statusCode: 200, success: true, message, data });
  }

  /** 201 Created — resource created successfully. */
  static created<T>(data: T, message: string = 'Tạo thành công'): ApiResponse<T> {
    return new ApiResponse({ statusCode: 201, success: true, message, data });
  }

  /** 204 No Content — operation succeeded, no data to return. */
  static noContent(message: string = 'Thành công'): ApiResponse<null> {
    return new ApiResponse({ statusCode: 204, success: true, message, data: null });
  }

  /** Error response — generic error with custom status code. */
  static error(
    statusCode: number,
    message: string,
    errors?: FieldError[],
  ): ApiResponse<null> {
    return new ApiResponse({ statusCode, success: false, message, data: null, errors });
  }

  /** 400 Bad Request — validation error with field-level details. */
  static validationError(
    message: string = 'Dữ liệu không hợp lệ',
    errors: FieldError[] = [],
  ): ApiResponse<null> {
    return new ApiResponse({ statusCode: 400, success: false, message, data: null, errors });
  }

  /** 200 OK — paginated list response. */
  static paginated<T>(data: {
    data: T[];
    total: number;
    page: number;
    limit: number;
  }, message: string = 'Thành công'): ApiResponse<{
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return new ApiResponse({
      statusCode: 200,
      success: true,
      message,
      data: {
        items: data.data,
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(data.total / data.limit),
      },
    });
  }

  /** Serialize to plain object for Express `res.json()`. */
  toJSON() {
    const result: Record<string, unknown> = {
      success: this.success,
      message: this.message,
    };
    if (this.data !== undefined) result.data = this.data;
    if (this.errors && this.errors.length > 0) result.errors = this.errors;
    return result;
  }
}
