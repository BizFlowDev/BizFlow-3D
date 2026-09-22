import { z } from 'zod';
import { User } from '../../entities/User.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { ISubscriptionPlanRepository } from '../../repositories/ISubscriptionPlanRepository.js';
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
    private readonly storeRepo: IStoreRepository,
    private readonly subscriptionPlanRepo: ISubscriptionPlanRepository,
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

    // 2. Check store existence and subscription validity
    const store = await this.storeRepo.findById(data.storeId);
    if (!store) {
      throw new ValidationError('Cửa hàng không tồn tại');
    }

    // Kiểm tra trạng thái gói dịch vụ
    if (store.subscriptionStatus === 'expired') {
      throw new ValidationError(
        'Gói dịch vụ của cửa hàng đã hết hạn. Vui lòng nâng cấp hoặc gia hạn gói để thêm nhân viên mới.',
      );
    }

    if (store.subscriptionExpiresAt && new Date(store.subscriptionExpiresAt) < new Date()) {
      throw new ValidationError(
        'Thời hạn sử dụng gói dịch vụ đã kết thúc. Vui lòng gia hạn hoặc nâng cấp gói để tiếp tục thêm nhân viên.',
      );
    }

    // Kiểm tra giới hạn số lượng nhân viên theo gói dịch vụ
    const plan = await this.subscriptionPlanRepo.findBySlug(store.subscriptionPlan);
    const maxEmployees = plan?.maxEmployees ?? 1;

    // Đếm số lượng nhân viên hiện tại của cửa hàng (role = 'employee')
    const employeeSearchResult = await this.userRepo.searchEmployees({
      storeId: data.storeId,
      limit: 1,
    });
    const currentEmployeesCount = employeeSearchResult.total;

    if (currentEmployeesCount >= maxEmployees) {
      const planName = plan?.name || store.subscriptionPlan;
      throw new ValidationError(
        `Gói dịch vụ hiện tại (${planName}) chỉ cho phép tối đa ${maxEmployees} nhân viên. Cửa hàng hiện đã có ${currentEmployeesCount} nhân viên. Vui lòng nâng cấp gói để thêm nhân viên mới.`,
      );
    }

    // 3. Check email uniqueness within store
    const existing = await this.userRepo.findByEmail(data.email, data.storeId);
    if (existing) {
      throw new ConflictError(`Email "${data.email}" đã tồn tại trong cửa hàng`);
    }

    // 4. Hash password and create employee
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
