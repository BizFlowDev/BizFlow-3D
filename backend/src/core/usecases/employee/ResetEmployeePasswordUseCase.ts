import { z } from 'zod';
import { User } from '../../entities/User.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IPasswordHasher } from './CreateEmployeeUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { AuthorizationError } from '../../errors/AuthorizationError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ResetEmployeePasswordInputSchema = z.object({
  employeeId: z.string().uuid(),
  storeId: z.string().uuid(),
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
});

export interface ResetEmployeePasswordInput {
  employeeId: string;
  storeId: string;
  newPassword: string;
}

export class ResetEmployeePasswordUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: ResetEmployeePasswordInput): Promise<User> {
    const parsed = ResetEmployeePasswordInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu đặt lại mật khẩu không hợp lệ', fields);
    }
    const data = parsed.data;

    const employee = await this.userRepo.findById(data.employeeId);
    if (!employee) {
      throw new NotFoundError('Nhân viên');
    }

    if (!employee.belongsToStore(data.storeId)) {
      throw new AuthorizationError('Không có quyền đặt lại mật khẩu nhân viên này');
    }

    if (employee.role !== 'employee') {
      throw new AuthorizationError('Chỉ có thể đặt lại mật khẩu tài khoản nhân viên');
    }

    const passwordHash = await this.passwordHasher.hash(data.newPassword);

    return this.userRepo.update(data.employeeId, { passwordHash });
  }
}
