import { getRedisClient } from './redisClient.js';
import { IRefreshTokenStore } from '../../core/usecases/auth/LoginUseCase.js';

/** TTL for refresh tokens: 7 days in seconds */
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800

/** Redis key prefix for refresh tokens */
const KEY_PREFIX = 'refresh_token:';

/**
 * Redis-backed implementation of IRefreshTokenStore.
 * Stores one refresh token per user, keyed by userId.
 * Each entry has a TTL of 7 days matching the JWT refresh token expiry.
 */
export class RedisRefreshTokenStore implements IRefreshTokenStore {
  /**
   * Save (or overwrite) a refresh token for a user.
   * Uses SETEX to atomically set value + TTL.
   */
  async save(userId: string, refreshToken: string): Promise<void> {
    const client = getRedisClient();
    await client.setex(`${KEY_PREFIX}${userId}`, REFRESH_TOKEN_TTL_SECONDS, refreshToken);
  }

  /**
   * Retrieve the stored refresh token for a user.
   * Returns null if not found or expired.
   */
  async get(userId: string): Promise<string | null> {
    const client = getRedisClient();
    const token = await client.get(`${KEY_PREFIX}${userId}`);
    return token;
  }

  /**
   * Delete the stored refresh token for a user (logout / rotation).
   */
  async delete(userId: string): Promise<void> {
    const client = getRedisClient();
    await client.del(`${KEY_PREFIX}${userId}`);
  }
}
