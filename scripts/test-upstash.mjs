import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

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

console.log('URL:', redisUrl);
console.log('Token:', redisToken ? '***' : 'missing');

// Check if URL or Token is missing
if (!redisUrl || !redisToken) {
  console.error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});

async function test() {
  const key = 'test-set-error';
  const data = {
    _id: "69aa2d63f77c63eecdfa30a5",
    name: "Test Product",
    price: 100,
    nested: { foo: "bar" }
  };

  try {
    console.log('Testing set with object directly...');
    // This is what src/lib/redis.ts does currently
    await redis.set(key, data, { ex: 60 });
    console.log('Set successful!');
    
    const val = await redis.get(key);
    console.log('Got value:', val);
  } catch (error) {
    console.error('Set failed:', error);
  }
  
  try {
    console.log('Testing set with stringified object...');
    await redis.set(key + '-str', JSON.stringify(data), { ex: 60 });
    console.log('Set stringified successful!');
    
    const val = await redis.get(key + '-str');
    console.log('Got stringified value:', val);
  } catch (error) {
    console.error('Set stringified failed:', error);
  }
}

test();
