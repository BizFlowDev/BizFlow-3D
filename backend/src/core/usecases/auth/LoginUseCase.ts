import { IUserRepository } from '../../repositories/IUserRepository.js';
import { AuthenticationError } from '../../errors/AuthenticationError.js';
import { ValidationError } from '../../errors/ValidationError.js';

/** Abstract password hashing — keeps core layer framework-free. */
export interface IPasswordHasher {
  compare(plain: string, hash: string): Promise<boolean>;
}

/** Abstract token generation — keeps core layer framework-free. */
export interface ITokenService {
  generateAccessToken(payload: { userId: string; storeId: string | null; role: string }): string;
  generateRefreshToken(payload: { userId: string }): string;
}

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
    fullName: string;
    email: string;
    role: string;
  };
}

export class LoginUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    // 1. Validate input
    if (!input.email || !input.password) {
      throw new ValidationError('Email và mật khẩu không được để trống');
    }

    // 2. Find user by email (global lookup — no storeId scope)
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new AuthenticationError('Email hoặc mật khẩu không đúng');
    }

    // 3. Check active status
    if (!user.isActive) {
      throw new AuthenticationError('Tài khoản đã bị vô hiệu hóa');
    }

    // 4. Verify password
    const isValid = await this.passwordHasher.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Email hoặc mật khẩu không đúng');
    }

    // 5. Update last login
    await this.userRepo.updateLastLogin(user.id);

    // 6. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
    });
    const refreshToken = this.tokenService.generateRefreshToken({ userId: user.id });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        storeId: user.storeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }
}
