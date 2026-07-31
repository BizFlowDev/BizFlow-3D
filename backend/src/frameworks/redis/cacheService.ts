import { getRedisClient } from './redisClient.js';

/**
 * Get a value from Redis cache.
 * @param key The cache key
 * @returns The parsed JSON object or null if not found
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in Redis cache.
 * @param key The cache key
 * @param value The value to cache (will be JSON stringified)
 * @param ttlSeconds Optional time-to-live in seconds
 */
export async function setCache(key: string, value: any, ttlSeconds?: number): Promise<void> {
  try {
    const client = getRedisClient();
    const stringValue = JSON.stringify(value);
    
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

/**
 * Delete a value from Redis cache.
 * @param key The cache key to delete
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(key);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
}

/**
 * Set expiry for an existing key.
 * @param key The cache key
 * @param ttlSeconds Time-to-live in seconds
 */
export async function expireCache(key: string, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient();
    await client.expire(key, ttlSeconds);
  } catch (error) {
    console.error(`Error expiring cache for key ${key}:`, error);
  }
}
