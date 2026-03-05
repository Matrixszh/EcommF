import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('Please define the REDIS_URL environment variable inside .env.local');
  process.exit(1);
}

async function flushRedis() {
  const redis = new Redis(redisUrl);
  
  try {
    console.log('Connecting to Redis...');
    await redis.ping();
    console.log('Connected to Redis');
    
    await redis.flushall();
    console.log('Redis cache flushed successfully.');
    
  } catch (error) {
    console.error('Error flushing Redis:', error);
  } finally {
    redis.quit();
  }
}

flushRedis();
