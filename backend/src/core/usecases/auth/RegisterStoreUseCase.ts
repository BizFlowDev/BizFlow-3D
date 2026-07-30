import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { User } from '../../entities/User.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
}

// ── Input schema ──
const RegisterInputSchema = z.object({
  storeName: z.string().min(1).max(255),
  storeAddress: z.string().nullish(),
  storePhone: z.string().max(20).nullish(),
  storeEmail: z.string().email().max(255).nullish(),
  taxCode: z.string().max(50).nullish(),
  ownerFullName: z.string().min(1).max(255),
  ownerEmail: z.string().email().max(255),
  ownerPhone: z.string().max(20).nullish(),
  ownerPassword: z.string().min(6),
});

export type RegisterStoreInput = z.infer<typeof RegisterInputSchema>;

export interface RegisterStoreOutput {
  store: Store;
  owner: User;
}

export class RegisterStoreUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: RegisterStoreInput): Promise<RegisterStoreOutput> {
    // 1. Validate input
    const parsed = RegisterInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu đăng ký không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Check if owner email already exists
    const existingUser = await this.userRepo.findByEmail(data.ownerEmail);
    if (existingUser) {
      throw new ConflictError('Email đã được sử dụng');
    }

    // 3. Create store
    const store = Store.create({
      name: data.storeName,
      address: data.storeAddress,
      phone: data.storePhone,
      email: data.storeEmail,
      taxCode: data.taxCode,
      subscriptionPlan: 'basic',
      subscriptionStatus: 'trial',
      subscriptionExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14-day trial
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
    const createdOwner = await this.userRepo.create(owner);

    return { store: createdStore, owner: createdOwner };
  }
}
