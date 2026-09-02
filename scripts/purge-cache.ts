import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function main() {
  const keys = await redis.keys('*');
  let deleted = 0;
  for (const key of keys) {
    if (key.startsWith('cache:') || key.startsWith('config:')) {
      await redis.del(key);
      deleted++;
      console.log(`Deleted key: ${key}`);
    } else {
      console.log(`Kept key: ${key}`);
    }
  }
  console.log(`Deleted ${deleted} cache/config keys.`);
}
main().catch(console.error);
