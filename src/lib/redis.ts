import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN;

declare global {
  var redisClient: Redis | null | undefined;
}

let redis: Redis | null = global.redisClient ?? null;

if (!redis && redisUrl && redisUrl.startsWith('http')) {
  // Ensure we have a token if required
  if (!redisToken) {
    console.warn('[Redis] REST URL found but no token. Upstash Redis will likely fail authentication.');
  }

  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken || '',
    });
    console.log('[Redis] Client initialized (Upstash HTTP)');

    // Inject into global only if initialization didn't throw
    if (typeof global !== 'undefined') {
      (global as any).redisClient = redis;
    }
  } catch (err) {
    console.error('[Redis] Failed to initialize Upstash client:', err);
    redis = null;
  }
} else if (redisUrl && !redisUrl.startsWith('http')) {
  console.warn(`[Redis] REDIS_URL (${redisUrl}) is not an HTTP URL. @upstash/redis requires a REST URL (starting with http/https). Please use UPSTASH_REDIS_REST_URL.`);
  redis = null;
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
  // If redis is explicitly null or was disabled due to errors, skip caching
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
      const valueToStore = typeof freshData === 'object' ? JSON.stringify(freshData) : freshData;
      await redis.set(key, valueToStore, { ex: ttl });
    }

    return freshData;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Redis cache error for key ${key}:`, errorMsg);

    // If it's an auth error, disable redis for this instance to avoid constant failing requests
    if (errorMsg.includes('WRONGPASS') || errorMsg.includes('Unauthorized') || errorMsg.includes('token')) {
      console.warn('[Redis] Authentication error detected. Disabling Redis client for the current process.');
      redis = null;
      // Update global client as well to avoid reuse in same lambda instance if possible
      if (typeof global !== 'undefined') {
        global.redisClient = null;
      }
    }

    // Fall back to the fetcher (DB or Mock data)
    return fetcher();
  }
}
