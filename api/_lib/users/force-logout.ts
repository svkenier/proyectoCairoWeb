/**
 * POST /api/users/force-logout
 *
 * Incrementa el tokenVersion de un usuario, forzando la invalidación de sus sesiones actuales.
 * Solo puede ser ejecutado por el SuperAdmin principal.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { target_username: string }
 * Response 200: { ok: true }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from '../auth.js';
import { getUser, updateUserPreservingTTL } from '../kv.js';

const SUPERADMIN_USERNAME = process.env['SUPERADMIN_USERNAME'] ?? 'svkenier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const payload = await getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  // Solo el superadmin principal puede forzar el cierre de sesión
  if (payload.sub !== SUPERADMIN_USERNAME) {
    return res.status(403).json({ error: 'No tienes permiso para forzar el cierre de sesión' });
  }

  const { target_username } = req.body as { target_username?: string };

  if (!target_username) {
    return res.status(400).json({ error: 'Falta target_username' });
  }

  if (target_username === SUPERADMIN_USERNAME) {
    return res.status(400).json({ error: 'No puedes forzar el cierre de sesión de tu propia cuenta principal' });
  }

  const targetUser = await getUser(target_username);

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const newTokenVersion = (targetUser.tokenVersion || 1) + 1;
  await updateUserPreservingTTL(target_username, { tokenVersion: newTokenVersion });

  return res.status(200).json({ ok: true });
}
