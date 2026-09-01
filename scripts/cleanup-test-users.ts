import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' }); // Load .env.local if present

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});

async function runCleanup() {
  console.log('Fetching test users...');
  const keys = await redis.keys('user:testuser_*');
  if (keys.length === 0) {
    console.log('No orphaned test users found.');
    return;
  }
  
  console.log(`Found ${keys.length} orphaned users. Deleting...`);
  let deleted = 0;
  for (const key of keys) {
    await redis.del(key);
    console.log(`Deleted ${key}`);
    deleted++;
  }
  
  console.log(`Successfully deleted ${deleted} orphaned test users.`);
}

runCleanup().catch(console.error);
