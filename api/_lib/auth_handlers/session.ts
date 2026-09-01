/**
 * GET /api/auth/session
 *
 * Endpoint de validación estricta de sesión.
 * Utiliza getAuthPayload() que internamente verifica que el tokenVersion
 * del JWT coincida con el almacenado en Upstash Redis.
 *
 * Headers: Authorization: Bearer <token>
 * Response 200: { ok: true, user: JWTPayload }
 * Response 401: { error: 'No autenticado' } (manejado automáticamente por cliente si falla)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from '../auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const payload = await getAuthPayload(req);
  if (!payload) {
    return res.status(401).json({ error: 'No autenticado o sesión revocada' });
  }

  return res.status(200).json({ ok: true, user: payload });
}
