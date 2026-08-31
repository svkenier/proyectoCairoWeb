/**
 * Utilidades de Upstash Redis (Vercel KV) para el almacenamiento de usuarios.
 *
 * Variables de entorno requeridas (inyectadas al vincular la integración de Redis en Vercel):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Esquema de claves:
 *   user:{username}  → JSON serializado de KVUser
 *
 * TTL de 30 días (2_592_000 s) se activa al logout y se cancela al login.
 * El SuperAdmin (SUPERADMIN_USERNAME) nunca tiene TTL.
 */

import { Redis } from '@upstash/redis';
import type { KVUser, PublicUser } from '../../src/types/user.js';

const TTL_30_DAYS = 30 * 24 * 60 * 60; // segundos

/** Instancia del cliente Redis usando las variables de entorno de Vercel. */
export const redis = new Redis({
  url:   process.env['UPSTASH_REDIS_REST_URL']   ?? '',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
});

const userKey = (username: string) => `user:${username}`;

// ─── Operaciones CRUD de usuario ──────────────────────────────────────────────

/** Obtiene un usuario de KV. Retorna null si no existe. */
export async function getUser(username: string): Promise<KVUser | null> {
  return redis.get<KVUser>(userKey(username));
}

/**
 * Guarda un usuario en KV.
 * @param ttl - Si se provee, se aplica expiración en segundos.
 */
export async function setUser(user: KVUser, ttl?: number): Promise<void> {
  if (ttl) {
    await redis.set(userKey(user.username), user, { ex: ttl });
  } else {
    await redis.set(userKey(user.username), user);
  }
}

/** Elimina un usuario de KV. */
export async function deleteUser(username: string): Promise<void> {
  await redis.del(userKey(username));
}

/** Activa el TTL de 30 días en la cuenta de un usuario (logout). */
export async function activateTTL(username: string): Promise<void> {
  await redis.expire(userKey(username), TTL_30_DAYS);
}

/**
 * Cancela el TTL de la cuenta (login exitoso).
 * Hace la clave persistente (sin expiración).
 */
export async function cancelTTL(username: string): Promise<void> {
  await redis.persist(userKey(username));
}

/** Verifica si un usuario con el username dado ya existe en KV. */
export async function userExists(username: string): Promise<boolean> {
  const exists = await redis.exists(userKey(username));
  return exists === 1;
}

/**
 * Lista todos los usuarios registrados.
 * Excluye el campo `password_hash` de la respuesta.
 */
export async function listUsers(): Promise<PublicUser[]> {
  const keys = await redis.keys('user:*');
  if (keys.length === 0) return [];

  const users = await Promise.all(keys.map((k) => redis.get<KVUser>(k)));

  return users
    .filter((u): u is KVUser => u !== null)
    .map(({ password_hash: _ph, ...pub }) => pub as PublicUser)
    .sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Actualiza el campo last_login de un usuario.
 * Preserva el TTL actual si existe.
 */
export async function updateLastLogin(username: string): Promise<void> {
  const user = await getUser(username);
  if (!user) return;
  user.last_login = new Date().toISOString();
  await setUser(user); // sin TTL: la llamada a cancelTTL se hace por separado
}

// ─── Caché Pública ────────────────────────────────────────────────────────────

const CACHE_KEY_PETS = 'cache:pets_json';

/** Guarda el catálogo de mascotas en Redis con TTL de 10 minutos. */
export async function setPetsCache(petsArray: unknown[]): Promise<void> {
  await redis.set(CACHE_KEY_PETS, petsArray, { ex: 600 }); // 10 min
}

/** Obtiene el catálogo de mascotas desde Redis. */
export async function getPetsCache(): Promise<unknown[] | null> {
  return redis.get<unknown[]>(CACHE_KEY_PETS);
}

/** Invalida la caché del catálogo (usado tras un commit a Github). */
export async function invalidatePetsCache(): Promise<void> {
  await redis.del(CACHE_KEY_PETS);
}

// ─── Configuración Global (Settings) ──────────────────────────────────────────

const SETTINGS_KEY = 'config:general';

/** Obtiene la configuración global del refugio. Retorna null si no existe. */
export async function getGlobalSettings(): Promise<unknown | null> {
  return redis.get(SETTINGS_KEY);
}

/** Guarda la configuración global del refugio. */
export async function setGlobalSettings(settings: unknown): Promise<void> {
  await redis.set(SETTINGS_KEY, settings);
}

// ─── Anuncios (Eliminados de KV, ahora en GitHub) ──────────────────────────────────────────────

