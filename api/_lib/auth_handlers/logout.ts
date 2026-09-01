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
import { activateTTL, cancelTTL, TTL_30_DAYS, TTL_6_MONTHS } from '../kv.js';

const SUPERADMIN_USERNAME = process.env['SUPERADMIN_USERNAME'] ?? 'svkenier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const payload = await getAuthPayload(req);

  if (!payload) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (payload.sub === SUPERADMIN_USERNAME) {
    // Inmunidad: El superadmin no expira nunca
    await cancelTTL(payload.sub);
  } else if (payload.role === 'superadmin' || payload.role === 'encargado') {
    // Administradores y encargados expiran en 6 meses
    await activateTTL(payload.sub, TTL_6_MONTHS);
  } else {
    // Voluntarios expiran en 30 días
    await activateTTL(payload.sub, TTL_30_DAYS);
  }

  return res.status(200).json({ ok: true });
}
