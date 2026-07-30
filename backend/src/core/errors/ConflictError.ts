import { AppError } from './AppError.js';

/**
 * Thrown when a resource conflict occurs — duplicate entries, unique constraint violations.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Dữ liệu bị trùng lặp') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}
