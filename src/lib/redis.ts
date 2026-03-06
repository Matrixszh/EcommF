import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN;

declare global {
  var redisClient: Redis | null | undefined;
}

let redis: Redis | null = global.redisClient ?? null;

if (!redis && redisUrl && redisUrl.startsWith('http')) {
  // Ensure we have a token if required, or assume it's embedded in URL?
  // Upstash client usually needs url and token.
  if (!redisToken) {
    console.warn('[Redis] REST URL found but no token. Upstash Redis might fail if authentication is required.');
  }
  
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken || '',
      // Automatic deserialization is true by default, but we'll handle it carefully
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

// Helper to invalidate cache patterns
export async function invalidateCache(pattern: string) {
  if (!redis) return;
  
  try {
    // Upstash 'keys' command (careful with large datasets, but usually fine for Vercel/Upstash scale)
    // Scan is better but 'keys' is supported by REST API
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis] Invalidated ${keys.length} keys for pattern ${pattern}`);
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
    // Upstash automatically deserializes JSON if stored as such
    const cachedData = await redis.get<T>(key);

    if (cachedData !== null && cachedData !== undefined) {
      console.log(`[CACHE HIT] ${key}`);
      
      // If cachedData is a string but we expect an object, try parsing
      if (typeof cachedData === 'string') {
        try {
          // Check if it looks like JSON
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
      // Upstash Set with options
      // If freshData is object, Upstash serializes it.
      // However, to be safe and consistent with retrieval logic, we explicit stringify if it's an object
      const valueToStore = typeof freshData === 'object' ? JSON.stringify(freshData) : freshData;
      await redis.set(key, valueToStore, { ex: ttl });
    }

    return freshData;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error instanceof Error ? error.message : error);
    return fetcher();
  }
}
