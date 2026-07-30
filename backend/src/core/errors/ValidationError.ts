import { AppError } from './AppError.js';

export interface FieldError {
  field: string;
  message: string;
}

/**
 * Thrown when input data fails validation (Zod schema or business rules).
 * Includes optional field-level error details.
 */
export class ValidationError extends AppError {
  public readonly fields: FieldError[];

  constructor(message: string = 'Dữ liệu không hợp lệ', fields: FieldError[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.fields = fields;
  }

  override toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        fields: this.fields,
      },
    };
  }
}
