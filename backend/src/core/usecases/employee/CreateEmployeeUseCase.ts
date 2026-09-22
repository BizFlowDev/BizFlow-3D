import { z } from 'zod';
import { User } from '../../entities/User.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
}

const CreateEmployeeInputSchema = z.object({
  storeId: z.string().uuid(),
  fullName: z.string().min(1, 'Họ tên không được để trống').max(255),
  email: z.string().email('Email không đúng định dạng').max(255),
  phone: z.string().max(20).nullish(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(128),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeInputSchema>;

export class CreateEmployeeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<User> {
    // 1. Validate input
    const parsed = CreateEmployeeInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu nhân viên không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Check email uniqueness within store
    const existing = await this.userRepo.findByEmail(data.email, data.storeId);
    if (existing) {
      throw new ConflictError(`Email "${data.email}" đã tồn tại trong cửa hàng`);
    }

    // 3. Hash password and create employee
    const passwordHash = await this.passwordHasher.hash(data.password);

    const employee = User.create({
      storeId: data.storeId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: 'employee',
    });

    return this.userRepo.create(employee);
  }
}
