import { z } from 'zod';
import { AuthenticationError } from '../../errors/AuthenticationError.js';
import { IRefreshTokenStore, ITokenService } from './LoginUseCase.js';

// ── Zod validation ───────────────────────────────────────────────────────────
const RefreshInputSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token không được để trống'),
});

// ── Interfaces ───────────────────────────────────────────────────────────────

/** Verifies and decodes a JWT refresh token. */
export interface ITokenVerifier {
  verifyRefreshToken(token: string): { userId: string; storeId: string | null; role: string };
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

// ── Use Case ─────────────────────────────────────────────────────────────────

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenVerifier: ITokenVerifier,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenStore: IRefreshTokenStore,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Validate input
    const parsed = RefreshInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AuthenticationError('Refresh token không hợp lệ');
    }
    const { refreshToken } = parsed.data;

    // 2. Verify the refresh token signature & expiry
    let payload: { userId: string; storeId: string | null; role: string };
    try {
      payload = this.tokenVerifier.verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    // 3. Check token exists in Redis (rotation validation)
    const storedToken = await this.refreshTokenStore.get(payload.userId);
    if (!storedToken || storedToken !== refreshToken) {
      throw new AuthenticationError('Refresh token đã bị thu hồi hoặc không tồn tại');
    }

    // 4. Generate new token pair
    const tokenPayload = {
      userId: payload.userId,
      storeId: payload.storeId,
      role: payload.role,
    };
    const newAccessToken = this.tokenService.generateAccessToken(tokenPayload);
    const newRefreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    // 5. Rotate: delete old, save new refresh token in Redis
    await this.refreshTokenStore.delete(payload.userId);
    await this.refreshTokenStore.save(payload.userId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
