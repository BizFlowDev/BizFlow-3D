import { AppError } from './AppError.js';

/**
 * Thrown when authentication fails — invalid credentials, expired/missing tokens.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Xác thực thất bại') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}
