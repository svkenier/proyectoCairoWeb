/**
 * GET /api/users/list
 *
 * Lista todos los usuarios registrados (sin password_hash).
 * Requiere rol mínimo: encargado.
 *
 * Headers: Authorization: Bearer <token>
 * Response 200: { users: PublicUser[] }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from '../_lib/auth.js';
import { listUsers } from '../_lib/kv.js';
import { ROLE_LEVEL } from '../../src/types/user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['encargado']) {
    return res.status(403).json({ error: 'No tienes permiso para listar usuarios' });
  }

  const users = await listUsers();

  return res.status(200).json({ users });
}
