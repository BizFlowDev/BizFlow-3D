import { z } from 'zod';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { User } from '../../entities/User.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';
import { AuthorizationError } from '../../errors/AuthorizationError.js';

const SoftDeleteEmployeeInputSchema = z.object({
  employeeId: z.string().uuid('ID nhân viên không hợp lệ'),
  storeId: z.string().uuid('ID cửa hàng không hợp lệ'),
  currentUserId: z.string().uuid('ID người thực hiện không hợp lệ'),
});

export type SoftDeleteEmployeeInput = z.infer<typeof SoftDeleteEmployeeInputSchema>;

export class SoftDeleteEmployeeUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: SoftDeleteEmployeeInput): Promise<User> {
    const parsed = SoftDeleteEmployeeInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Tham số không hợp lệ', fields);
    }
    const { employeeId, storeId, currentUserId } = parsed.data;

    // 1. Tìm nhân viên theo id
    const employee = await this.userRepo.findById(employeeId);
    if (!employee || employee.isDeleted()) {
      throw new NotFoundError('Nhân viên không tồn tại hoặc đã bị xóa');
    }

    // 2. Không cho phép tự xóa chính mình
    if (employee.id === currentUserId) {
      throw new ValidationError('Không thể tự xóa tài khoản của chính mình');
    }

    // 3. Kiểm tra thuộc cửa hàng
    if (!employee.belongsToStore(storeId)) {
      throw new AuthorizationError('Nhân viên không thuộc quyền quản lý của cửa hàng này');
    }

    // 4. Chỉ cho phép xóa tài khoản nhân viên (role = 'employee')
    if (employee.role !== 'employee') {
      throw new ValidationError('Chỉ có thể xóa tài khoản nhân viên, không thể xóa chủ cửa hàng hoặc quản trị viên');
    }

    // 5. Thực hiện xóa mềm
    await this.userRepo.softDelete(employeeId);

    return employee;
  }
}
