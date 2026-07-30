import { AppError } from './AppError.js';

/**
 * Thrown when a user does not have sufficient permissions for the requested action.
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}
