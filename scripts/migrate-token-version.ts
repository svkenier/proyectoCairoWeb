/**
 * Migración: Inicializa tokenVersion = 1 en todos los usuarios de Redis
 * que no tengan el campo definido explícitamente.
 *
 * Ejecutar una sola vez con: npx tsx scripts/migrate-token-version.ts
 */

import 'dotenv/config';
import { Redis } from '@upstash/redis';
import type { KVUser } from '../src/types/user.js';

const redis = new Redis({
  url:   process.env['UPSTASH_REDIS_REST_URL']   ?? '',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
});

async function migrate() {
  console.log('=== MIGRACIÓN: tokenVersion en usuarios Redis ===\n');

  const keys = await redis.keys('user:*');

  if (keys.length === 0) {
    console.log('No se encontraron usuarios en Redis. Saliendo.');
    return;
  }

  console.log(`Usuarios encontrados: ${keys.length}\n`);

  let migrated = 0;
  let skipped  = 0;

  for (const key of keys) {
    const user = await redis.get<KVUser>(key);
    if (!user) { skipped++; continue; }

    if (typeof user.tokenVersion === 'number') {
      console.log(`  [OK]      ${key}  →  tokenVersion=${user.tokenVersion} (sin cambio)`);
      skipped++;
      continue;
    }

    // Parchear el campo — preservar TTL
    const currentTtl = await redis.ttl(key);
    const patched: KVUser = { ...user, tokenVersion: 1 };

    if (currentTtl > 0) {
      await redis.set(key, patched, { ex: currentTtl });
    } else {
      await redis.set(key, patched);
    }

    console.log(`  [MIGRADO] ${key}  →  tokenVersion=1 (TTL preservado: ${currentTtl}s)`);
    migrated++;
  }

  console.log(`\n✅ Migración completada. Migrados: ${migrated}, sin cambio: ${skipped}`);
}

migrate().catch((err) => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
