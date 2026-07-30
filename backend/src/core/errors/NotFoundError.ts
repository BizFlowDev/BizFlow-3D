import { AppError } from './AppError.js';

/**
 * Thrown when a requested resource is not found in the system.
 */
export class NotFoundError extends AppError {
  public readonly entityName: string;

  constructor(entityName: string, message?: string) {
    super(message ?? `${entityName} không tìm thấy`, 404, 'NOT_FOUND');
    this.entityName = entityName;
  }
}
