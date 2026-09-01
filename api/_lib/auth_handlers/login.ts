/**
 * POST /api/auth/login
 *
 * Valida credenciales, cancela el TTL (hace la cuenta persistente) y entrega JWT.
 *
 * Body: { username: string, password: string }
 * Response 200: { token: string, user: PublicUser }
 * Response 401: { error: 'Credenciales inválidas' }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, cancelTTL, updateLastLogin } from '../kv.js';
import { signToken } from '../auth.js';
import { authRateLimit, checkRateLimit } from '../rate-limit.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Rate limit
  const ip = req.headers['x-forwarded-for'] as string ?? '127.0.0.1';
  const limitRes = await checkRateLimit(authRateLimit, ip);
  
  res.setHeader('X-RateLimit-Limit', limitRes.limit);
  res.setHeader('X-RateLimit-Remaining', limitRes.remaining);
  
  if (!limitRes.success) {
    return res.status(429).json({ error: 'Demasiados intentos. Intenta más tarde.' });
  }

  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan username o password' });
  }

  const normalizedUsername = username.trim().toLowerCase();

  // 1. Buscar usuario en KV
  const user = await getUser(normalizedUsername);

  if (!user) {
    // Respuesta idéntica para no revelar si el usuario existe
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 2. Verificar contraseña
  const passwordOk = await bcrypt.compare(password, user.password_hash);

  if (!passwordOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // 3. Cancelar TTL (cuenta persistente mientras sesión activa)
  await cancelTTL(normalizedUsername);

  // 4. Actualizar last_login
  await updateLastLogin(normalizedUsername);

  // 5. Firmar JWT
  const token = signToken(user.username, user.role, user.tokenVersion || 1);

  // 6. Responder con token y datos públicos del usuario
  const { password_hash: _ph, ...publicUser } = user;

  return res.status(200).json({ token, user: publicUser });
}
