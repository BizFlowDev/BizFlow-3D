import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { User } from '../../entities/User.js';
import { IStoreRepository, AdminStoreRow } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IPasswordHasher } from '../auth/RegisterStoreUseCase.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

// ── Input schema ──
const CreateStoreInputSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).nullish(),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(255).nullish(),
  taxCode: z.string().max(50).nullish(),
  ownerFullName: z.string().min(1).max(255),
  ownerEmail: z.string().email().max(255),
  ownerPhone: z.string().max(20).nullish(),
  ownerPassword: z.string().min(6).max(128),
  subscriptionPlan: z.string().min(1).max(50).default('basic'),
  subscriptionStatus: z.enum(['active', 'expired', 'trial']).default('active'),
  durationMonths: z.number().int().min(1).max(120).default(1),
});

export type CreateStoreInput = z.infer<typeof CreateStoreInputSchema>;

/**
 * Admin: create a new store together with its owner account.
 */
export class CreateStoreUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: CreateStoreInput): Promise<AdminStoreRow> {
    // 1. Validate input
    const parsed = CreateStoreInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu cửa hàng không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Check uniqueness
    if (data.email) {
      const existingStore = await this.storeRepo.findByEmail(data.email);
      if (existingStore) {
        throw new ConflictError('Email cửa hàng đã được sử dụng');
      }
    }
    const existingOwner = await this.userRepo.findByEmail(data.ownerEmail);
    if (existingOwner) {
      throw new ConflictError('Email chủ sở hữu đã được sử dụng');
    }

    // 3. Create store
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + data.durationMonths);
    const store = Store.create({
      name: data.name,
      address: data.address,
      phone: data.phone,
      email: data.email,
      taxCode: data.taxCode,
      subscriptionPlan: data.subscriptionPlan,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt: expiresAt,
    });
    const createdStore = await this.storeRepo.create(store);

    // 4. Hash password & create owner user
    const passwordHash = await this.passwordHasher.hash(data.ownerPassword);
    const owner = User.create({
      storeId: createdStore.id,
      fullName: data.ownerFullName,
      email: data.ownerEmail,
      phone: data.ownerPhone,
      passwordHash,
      role: 'owner',
    });
    await this.userRepo.create(owner);

    // 5. Return admin row with owner + aggregate info
    const result = await this.storeRepo.findAdminById(createdStore.id);
    if (!result) {
      throw new ValidationError('Không thể tải thông tin cửa hàng vừa tạo');
    }
    return result;
  }
}