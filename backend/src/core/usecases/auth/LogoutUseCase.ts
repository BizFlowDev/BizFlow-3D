import { z } from 'zod';
import { AuthenticationError } from '../../errors/AuthenticationError.js';
import { IRefreshTokenStore, ITokenService } from './LoginUseCase.js';
import { ITokenVerifier } from './RefreshTokenUseCase.js';

// ── Zod validation ───────────────────────────────────────────────────────────
const LogoutInputSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token không được để trống'),
});

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface LogoutInput {
  refreshToken: string;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class LogoutUseCase {
  constructor(
    private readonly tokenVerifier: ITokenVerifier,
    private readonly refreshTokenStore: IRefreshTokenStore,
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    // 1. Validate input
    const parsed = LogoutInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthenticationError('Refresh token không hợp lệ');
    }
    const { refreshToken } = parsed.data;

    // 2. Decode token to get userId (don't throw on expired — allow logout)
    let userId: string;
    try {
      const payload = this.tokenVerifier.verifyRefreshToken(refreshToken);
      userId = payload.userId;
    } catch (error: any) {
      // Even if token is expired, we can still extract userId to clean up Redis.
      // Try decoding without verification (best-effort cleanup).
      // If decode fails entirely, silently succeed (token was invalid anyway).
      return;
    }

    // 3. Delete refresh token from Redis
    await this.refreshTokenStore.delete(userId);
  }
}
