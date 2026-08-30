import { redis } from './kv.js';
import { Ratelimit } from '@upstash/ratelimit';

/** Rate limiter para endpoints públicos (10 reqs / 10s). */
export const publicRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/public',
});

/** Rate limiter para endpoints de auth/login (5 reqs / 60s). */
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  analytics: true,
  prefix: '@upstash/ratelimit/auth',
});

/**
 * Función middleware para verificar el rate limit según la IP (Vercel provee la IP en headers).
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  ip: string = '127.0.0.1'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const result = await limiter.limit(ip);
  return result;
}
