import { z } from 'zod';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { AuthenticationError } from '../../errors/AuthenticationError.js';
import { ValidationError } from '../../errors/ValidationError.js';

// ── Zod validation schema ────────────────────────────────────────────────────
const LoginInputSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không đúng định dạng'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống'),
});

// ── Interfaces (framework-free) ──────────────────────────────────────────────

/** Abstract password hashing — keeps core layer framework-free. */
export interface IPasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}

/** Abstract token generation — keeps core layer framework-free. */
export interface ITokenService {
  generateAccessToken(payload: { userId: string; storeId: string | null; role: string }): string;
  generateRefreshToken(payload: { userId: string; storeId: string | null; role: string }): string;
}

/** Abstract refresh token persistence — keeps core layer framework-free. */
export interface IRefreshTokenStore {
  /** Save a refresh token for a user (overwrites existing). */
  save(userId: string, refreshToken: string): Promise<void>;
  /** Retrieve stored refresh token for a user. */
  get(userId: string): Promise<string | null>;
  /** Delete stored refresh token for a user. */
  delete(userId: string): Promise<void>;
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    storeId: string | null;
    storeName: string | null;
    fullName: string;
    email: string;
    role: string;
  };
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly storeRepo: IStoreRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenStore: IRefreshTokenStore,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Validate input with zod
    const parsed = LoginInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu đăng nhập không hợp lệ', fields);
    }
    const { email, password } = parsed.data;

    // 2. Find user by email (global lookup — no storeId scope)
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Email hoặc mật khẩu không đúng');
    }

    // 3. Check active status
    if (!user.isActive) {
      throw new AuthenticationError('Tài khoản đã bị vô hiệu hóa');
    }

    // 4. Verify password with bcryptjs
    const isValid = await this.passwordHasher.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Email hoặc mật khẩu không đúng');
    }

    // 5. Fetch store info if user belongs to a store
    let storeName: string | null = null;
    if (user.storeId) {
      const store = await this.storeRepo.findById(user.storeId);
      storeName = store?.name ?? null;
    }

    // 6. Update last login timestamp
    await this.userRepo.updateLastLogin(user.id);

    // 7. Generate JWT access token (15m) + refresh token (7d)
    const payload = { userId: user.id, storeId: user.storeId, role: user.role };
    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    // 8. Persist refresh token in Redis (overwrites previous)
    await this.refreshTokenStore.save(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        storeId: user.storeId,
        storeName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
