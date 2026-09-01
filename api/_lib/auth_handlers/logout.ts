/**
 * POST /api/auth/logout
 *
 * Activa el TTL de 30 días en la cuenta del usuario autenticado.
 * El token JWT sigue siendo válido por su duración (7 días) pero la
 * cuenta se auto-elimina de KV después de 30 días de inactividad.
 *
 * Headers: Authorization: Bearer <token>
 * Response 200: { ok: true }
 * Response 401: Sin autenticación
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from '../auth.js';
import { activateTTL, cancelTTL } from '../kv.js';

const SUPERADMIN_USERNAME = process.env['SUPERADMIN_USERNAME'] ?? 'svkenier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const payload = getAuthPayload(req);

  if (!payload) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (payload.sub === SUPERADMIN_USERNAME) {
    // Inmunidad: El superadmin no expira nunca
    await cancelTTL(payload.sub);
  } else {
    // Activar TTL de 30 días — la cuenta se preserva por si vuelven a entrar
    await activateTTL(payload.sub);
  }

  return res.status(200).json({ ok: true });
}
