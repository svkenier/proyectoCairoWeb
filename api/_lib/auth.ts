/**
 * Utilidades de autenticación JWT para los Serverless Functions.
 * Solo se usa en el backend — NO importar desde src/.
 */

import jwt from 'jsonwebtoken';
import type { VercelRequest } from '@vercel/node';
import type { JWTPayload, UserRole } from '../../src/types/user.js';

const JWT_SECRET  = process.env['JWT_SECRET']  ?? 'dev-secret-change-me';
const JWT_EXPIRES = '7d'; // 7 días de validez

/** Firma un token JWT con username y role. */
export function signToken(username: string, role: UserRole): string {
  return jwt.sign({ sub: username, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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
export function getAuthPayload(req: VercelRequest): JWTPayload | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
