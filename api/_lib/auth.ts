/**
 * Utilidades de autenticación JWT para los Serverless Functions.
 * Solo se usa en el backend — NO importar desde src/.
 */

import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';
import type { JWTPayload, UserRole } from '../../src/types/user.js';
import { getUser } from './kv.js';

const JWT_SECRET  = process.env['JWT_SECRET']  ?? 'dev-secret-change-me';
const JWT_EXPIRES = '7d'; // 7 días de validez

/** Firma un token JWT con username y role. */
export function signToken(username: string, role: UserRole, tokenVersion: number = 1): string {
  return jwt.sign({ sub: username, role, tokenVersion }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Verifica y decodifica un token JWT.
 * Lanza JsonWebTokenError si el token es inválido o expirado.
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Extrae el Bearer token del header Authorization de una petición.
 * Retorna null si no hay token.
 */
export function extractToken(req: VercelRequest): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Extrae y verifica el token de la petición.
 * Retorna el payload o null si no hay token / es inválido.
 */
export async function getAuthPayload(req: VercelRequest): Promise<JWTPayload | null> {
  const token = extractToken(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    // Verificar si el tokenVersion coincide con el de la base de datos.
    // Usamos 1 como fallback solo si el campo es undefined en AMBOS lados
    // (compatibilidad con tokens/usuarios legacy). Si Redis tiene un valor
    // explícito mayor que 1, el JWT antiguo sin el campo quedará bloqueado.
    const user = await getUser(payload.sub);
    if (!user) return null; // El usuario fue eliminado de Redis

    const dbVersion      = user.tokenVersion      ?? 1;
    const payloadVersion = payload.tokenVersion   ?? 1;

    if (payloadVersion !== dbVersion) {
      return null; // Sesión revocada: tokenVersion no coincide
    }
    return payload;
  } catch {
    return null;
  }
}
