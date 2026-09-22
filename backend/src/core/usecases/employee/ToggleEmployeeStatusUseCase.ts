import { User } from '../../entities/User.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { AuthorizationError } from '../../errors/AuthorizationError.js';

export interface ToggleEmployeeStatusInput {
  employeeId: string;
  storeId: string;
  activate: boolean;
}

export class ToggleEmployeeStatusUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: ToggleEmployeeStatusInput): Promise<User> {
    const employee = await this.userRepo.findById(input.employeeId);
    if (!employee) {
      throw new NotFoundError('Nhân viên');
    }

    if (!employee.belongsToStore(input.storeId)) {
      throw new AuthorizationError('Không có quyền cập nhật nhân viên này');
    }

    if (employee.role !== 'employee') {
      throw new AuthorizationError('Chỉ có thể thay đổi trạng thái tài khoản nhân viên');
    }

    return this.userRepo.update(input.employeeId, {
      isActive: input.activate,
    });
  }
}
