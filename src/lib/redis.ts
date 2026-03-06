import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN;

declare global {
  var redisClient: Redis | null | undefined;
}

let redis: Redis | null = global.redisClient ?? null;

if (!redis && redisUrl && redisUrl.startsWith('http')) {
  if (!redisToken) {
    console.warn('[Redis] REST URL found but no token. Upstash Redis might fail if authentication is required.');
  }
  
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken || '',
    });
    console.log('[Redis] Client initialized (Upstash HTTP)');
    global.redisClient = redis;
  } catch (err) {
    console.warn('[Redis] Failed to initialize Upstash client:', err);
  }
} else if (redisUrl && !redisUrl.startsWith('http')) {
  console.warn('[Redis] REDIS_URL is not an HTTP URL. @upstash/redis requires a REST URL (starting with http/https). Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
} else if (!redisUrl) {
  console.warn('[Redis] No Redis URL found (UPSTASH_REDIS_REST_URL or REDIS_URL), caching disabled');
}

export default redis;

// ✅ Fixed: use SCAN instead of KEYS — KEYS with glob patterns is
// not reliably supported by Upstash's REST API and can silently return nothing.
export async function invalidateCache(pattern: string) {
  if (!redis) return;
  
  try {
    let cursor = 0;
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(nextCursor);
      keysToDelete.push(...keys);
    } while (cursor !== 0);

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
      console.log(`[Redis] Invalidated ${keysToDelete.length} keys for pattern ${pattern}`);
    }
  } catch (error) {
    console.error(`[Redis] Error invalidating pattern ${pattern}:`, error);
  }
}

export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  if (!redis) {
    return fetcher();
  }

  try {
    const cachedData = await redis.get<T>(key);

    if (cachedData !== null && cachedData !== undefined) {
      console.log(`[CACHE HIT] ${key}`);
      if (typeof cachedData === 'string') {
        try {
          if ((cachedData as string).startsWith('{') || (cachedData as string).startsWith('[')) {
            return JSON.parse(cachedData);
          }
        } catch (e) {
          // Not JSON, return as is
        }
      }
      return cachedData;
    }

    console.log(`[CACHE MISS] ${key}`);
    const freshData = await fetcher();

    if (freshData !== null && freshData !== undefined) {
      const valueToStore = typeof freshData === 'object' ? JSON.stringify(freshData) : freshData;
      await redis.set(key, valueToStore, { ex: ttl });
    }

    return freshData;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error instanceof Error ? error.message : error);
    return fetcher();
  }
}