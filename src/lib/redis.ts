import Redis from 'ioredis';

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL is not defined. Redis caching will be disabled.');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1, // Fail fast if Redis is down
      connectTimeout: 5000,    // 5s connection timeout
      enableOfflineQueue: false, // Don't queue commands if Redis is down
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error starts with "READONLY"
          return true;
        }
        return false;
      }
    });

    client.on('error', (err) => {
      // Suppress connection errors to avoid crashing the app, just log them
      console.error('Redis Client Error:', err.message);
    });

    return client;
  } catch (error) {
    console.error('Failed to create Redis client:', error);
    return null;
  }
};

// Singleton instance
const redis = getRedisClient();

export default redis;

/**
 * Cache wrapper helper with timeout protection
 * @param key Cache key
 * @param fetcher Function to fetch data if cache miss
 * @param ttl Time to live in seconds (default 60)
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  // If Redis is not initialized or not ready, skip it entirely
  if (!redis || redis.status !== 'ready') {
    return fetcher();
  }

  try {
    // Race Redis get against a 2s timeout
    const cachePromise = redis.get(key);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(undefined), 2000));
    
    const cachedData = await Promise.race([cachePromise, timeoutPromise]) as string | undefined | null;
    
    if (cachedData) {
      console.log(`[CACHE HIT] ${key}`);
      return JSON.parse(cachedData);
    }

    if (cachedData === undefined) {
      console.warn(`[CACHE TIMEOUT] Redis took too long for key ${key}, falling back to DB`);
    } else {
      console.log(`[CACHE MISS] ${key}`);
    }

    // Cache miss or timeout - fetch fresh data
    const freshData = await fetcher();

    // Save to cache (fire and forget, don't await)
    if (freshData && redis.status === 'ready') {
      redis.set(key, JSON.stringify(freshData), 'EX', ttl).catch(err => {
        console.error(`Failed to set cache for ${key}:`, err.message);
      });
    }

    return freshData;
  } catch (error) {
    // If Redis throws (e.g. offline queue disabled), just log and fallback
    console.error(`Redis cache error for key ${key}:`, error instanceof Error ? error.message : error);
    // Fallback to fresh data if Redis fails
    return fetcher();
  }
}

/**
 * Invalidate cache keys matching a pattern
 * @param pattern Glob pattern (e.g. "products:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis || redis.status !== 'ready') return;
  
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100
    });
    
    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await redis.unlink(keys).catch(err => console.error('Error unlinking keys:', err));
      }
    });
    
    return new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', (err) => {
        console.error('Redis scan stream error:', err);
        resolve(); // Resolve anyway to avoid crashing
      });
    });
  } catch (error) {
    console.error(`Error invalidating cache for pattern ${pattern}:`, error);
  }
}
