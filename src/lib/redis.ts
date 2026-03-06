import Redis from 'ioredis';

let redis: Redis | null = null;
const redisUrl = process.env.REDIS_URL;

if (redisUrl) {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1, // Fail fast if Redis is down
    connectTimeout: 5000,    // 5s connection timeout
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts
      if (times > 3) {
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    enableOfflineQueue: false, // Fail fast if disconnected
    lazyConnect: true, // Do not connect on import, wait for first command
    family: 0, // Force IPv4/IPv6 dual stack resolution
  });

  redis.on('error', (err) => {
    // Log error but do not crash
    console.warn('[Redis] Client Error:', err.message);
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected');
  });
} else {
  console.warn('[Redis] No REDIS_URL found, caching disabled');
}

export default redis;

// Helper to invalidate cache patterns
export async function invalidateCache(pattern: string) {
  if (!redis) return;
  // If lazyConnect is true, status might be 'wait' initially.
  // We allow 'wait', 'connecting', 'ready' to proceed.
  if (!['ready', 'connecting', 'wait'].includes(redis.status)) {
    console.warn('[Redis] Skipping invalidation, client not ready/connecting');
    return;
  }
  
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100
    });
    
    stream.on('data', (keys: string[]) => {
      if (keys.length) {
        redis?.del(keys).catch(err => console.error('[Redis] Del Error:', err));
      }
    });

    stream.on('error', (err) => {
      console.error('[Redis] Scan Stream Error:', err);
    });
    
    // Wait for stream to finish? scanStream is async in nature but doesn't return promise.
    // We just fire and forget for invalidation to avoid blocking.
  } catch (error) {
    console.error(`[Redis] Error invalidating pattern ${pattern}:`, error);
  }
}

export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  // Check if Redis is configured
  if (!redis) {
    return fetcher();
  }

  // Check Redis status. 
  // 'wait' = initialized but not connected (lazyConnect)
  // 'ready' = connected
  // 'connecting'/'reconnecting' = trying to connect
  // If status is 'end' or 'close', we should definitely skip.
  if (['end', 'close'].includes(redis.status)) {
    console.warn(`[Redis] Client status is '${redis.status}', skipping cache for ${key}`);
    return fetcher();
  }

  try {
    // Race: Redis get vs Timeout
    // Because lazyConnect is true, this .get() call will trigger the actual connection.
    const cachePromise = redis.get(key);
    
    // Reduce timeout to 1.5s to be even faster on fallback
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(undefined), 1500));

    const cachedData = await Promise.race([cachePromise, timeoutPromise]) as string | undefined | null;

    if (cachedData) {
      console.log(`[CACHE HIT] ${key}`);
      try {
        return JSON.parse(cachedData);
      } catch (parseError) {
        console.error(`[CACHE ERROR] Failed to parse JSON for key ${key}:`, parseError);
      }
    }

    if (cachedData === undefined) {
      console.warn(`[CACHE TIMEOUT] Redis took too long for key ${key}, falling back to DB`);
    } else if (cachedData === null) {
      console.log(`[CACHE MISS] ${key}`);
    }

    // Fetch fresh data
    const freshData = await fetcher();

    // Cache it (fire and forget)
    // Only cache if we are connected or connecting (don't queue if closed)
    if (freshData !== null && freshData !== undefined && ['ready', 'connecting', 'wait'].includes(redis.status)) {
      redis.set(key, JSON.stringify(freshData), 'EX', ttl).catch(err => {
        console.error(`Failed to set cache for ${key}:`, err.message);
      });
    } else {
      console.warn(`[CACHE SKIP] Not caching null/undefined data for key ${key}`);
    }

    return freshData;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error instanceof Error ? error.message : error);
    return fetcher();
  }
}
