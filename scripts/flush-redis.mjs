import { Redis } from '@upstash/redis';
import path from 'path';
import fs from 'fs';

// Try to load env vars manually if not present
// This is a simple parser for .env files to avoid installing dotenv
function loadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const val = values.join('=').trim().replace(/^["']|["']$/g, ''); // Simple quote removal
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (e) {
    // Ignore error if file doesn't exist
  }
}

loadEnv(path.resolve(process.cwd(), '.env.local'));

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN;

if (!redisUrl) {
  console.error('Please define UPSTASH_REDIS_REST_URL/TOKEN or REDIS_URL inside .env.local');
  console.error('Usage: node scripts/flush-redis.mjs');
  process.exit(1);
}

async function flushRedis() {
  // If we have a REST URL, use Upstash HTTP client
  if (redisUrl.startsWith('http')) {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken || '',
    });

    try {
      console.log('Connecting to Redis (Upstash HTTP)...');
      // Simple check
      await redis.set('flush-check', 'ok');
      console.log('Connected to Redis');

      await redis.flushdb();
      console.log('Redis cache flushed successfully.');
    } catch (error) {
      console.error('Error flushing Redis:', error);
      process.exit(1);
    }
  } else {
    console.error('This script now requires an HTTP-based Redis URL (Upstash) or you need to install ioredis again for TCP connections.');
    process.exit(1);
  }
}

flushRedis();
