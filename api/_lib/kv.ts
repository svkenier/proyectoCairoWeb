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

export const TTL_30_DAYS = 30 * 24 * 60 * 60; // 2,592,000 segundos
export const TTL_6_MONTHS = 180 * 24 * 60 * 60; // 15,552,000 segundos

/** Instancia del cliente Redis usando las variables de entorno de Vercel. */
export const redis = new Redis({
  url:   process.env['UPSTASH_REDIS_REST_URL']   ?? '',
  token: process.env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
});

const userKey = (username: string) => `user:${username}`;
/** Set global que registra todos los usernames (evita redis.keys O(N)). */
const USER_INDEX = 'user:index';


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
  // Registrar username en el índice (SADD es idempotente).
  await redis.sadd(USER_INDEX, user.username);
}

/** Elimina un usuario de KV. */
export async function deleteUser(username: string): Promise<void> {
  await redis.del(userKey(username));
  // Eliminar del índice al borrar el usuario.
  await redis.srem(USER_INDEX, username);
}

/** 
 * Actualiza parcialmente un usuario conservando su tiempo de expiración (TTL) actual.
 */
export async function updateUserPreservingTTL(username: string, updates: Partial<KVUser>): Promise<void> {
  const user = await getUser(username);
  if (!user) return;
  const currentTtl = await redis.ttl(userKey(username));
  const updatedUser = { ...user, ...updates };
  if (currentTtl > 0) {
    await redis.set(userKey(username), updatedUser, { ex: currentTtl });
  } else {
    // Si no tiene TTL (-1), se guarda sin expiración.
    await redis.set(userKey(username), updatedUser);
  }
}

/** Activa el TTL de 30 días en la cuenta de un usuario (logout). */
export async function activateTTL(username: string, durationSeconds: number = TTL_30_DAYS): Promise<void> {
  await redis.expire(userKey(username), durationSeconds);
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
 * Usa el Set indexado (user:index) para evitar redis.keys O(N).
 * Excluye el campo `password_hash` de la respuesta.
 */
export async function listUsers(): Promise<PublicUser[]> {
  const usernames = await redis.smembers(USER_INDEX);
  if (usernames.length === 0) return [];

  const users = await Promise.all(usernames.map((name) => redis.get<KVUser>(userKey(name))));

  return users
    .filter((u): u is KVUser => u !== null)
    .map(({ password_hash: _ph, ...pub }) => pub as PublicUser)
    .sort((a, b) => a.username.localeCompare(b.username));
}

/**
 * Actualiza el campo last_login de un usuario.
 * Usa updateUserPreservingTTL para NO sobreescribir tokenVersion ni el TTL activo.
 */
export async function updateLastLogin(username: string): Promise<void> {
  await updateUserPreservingTTL(username, { last_login: new Date().toISOString() });
}

// ─── Caché y Configuración (Eliminados de KV, ahora en GitHub) ──────────────────────────────────────────────

// ─── Anuncios (Eliminados de KV, ahora en GitHub) ──────────────────────────────────────────────

