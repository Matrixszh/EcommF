import Redis from 'ioredis';

const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL is not defined. Redis caching will be disabled.');
    return null;
  }

  try {
    const client = new Redis(redisUrl);
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
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
 * Cache wrapper helper
 * @param key Cache key
 * @param fetcher Function to fetch data if cache miss
 * @param ttl Time to live in seconds (default 60)
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60
): Promise<T> {
  if (!redis) {
    return fetcher();
  }

  try {
    // Try to get from cache
    const cachedData = await redis.get(key);
    
    if (cachedData) {
      console.log(`[CACHE HIT] ${key}`);
      return JSON.parse(cachedData);
    }

    // Cache miss - fetch fresh data
    console.log(`[CACHE MISS] ${key}`);
    const freshData = await fetcher();

    // Save to cache
    if (freshData) {
      await redis.set(key, JSON.stringify(freshData), 'EX', ttl);
    }

    return freshData;
  } catch (error) {
    console.error(`Redis cache error for key ${key}:`, error);
    // Fallback to fresh data if Redis fails
    return fetcher();
  }
}

/**
 * Invalidate cache keys matching a pattern
 * @param pattern Glob pattern (e.g. "products:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  
  try {
    const stream = redis.scanStream({
      match: pattern,
      count: 100
    });
    
    stream.on('data', async (keys: string[]) => {
      if (keys.length) {
        await redis.unlink(keys);
      }
    });
    
    return new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
  } catch (error) {
    console.error(`Error invalidating cache for pattern ${pattern}:`, error);
  }
}
