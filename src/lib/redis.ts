import { Redis } from '@upstash/redis';

// Initialize the Upstash Redis client using environment variables
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Fetch data from Redis cache first. If a cache miss occurs, execute
 * the fetchFn, cache the result, and return it.
 * Falls back gracefully to the fetch function if Redis is unavailable.
 */
export async function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return await fetchFn();
    }
    const cached = await redis.get(key);
    if (cached !== null && cached !== undefined) {
      return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T;
    }
  } catch (err) {
    console.error('Redis read error for key:', key, err);
  }

  const data = await fetchFn();

  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
    }
  } catch (err) {
    console.error('Redis write error for key:', key, err);
  }

  return data;
}

/**
 * Invalidate a cached key in Redis.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      await redis.del(key);
    }
  } catch (err) {
    console.error('Redis invalidation error for key:', key, err);
  }
}
