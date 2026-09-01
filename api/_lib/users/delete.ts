/**
 * DELETE /api/users/delete
 *
 * Elimina un usuario de KV.
 * - No se puede eliminar al superadmin principal (SUPERADMIN_USERNAME).
 * - No se puede eliminar al propio usuario que realiza la petición.
 * - Jerarquía: solo puedes eliminar a usuarios de menor rango.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { target_username: string }
 * Response 200: { ok: true }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from '../auth.js';
import { getUser, deleteUser } from '../kv.js';
import { ROLE_LEVEL, canManage } from '../../../src/types/user.js';

const SUPERADMIN_USERNAME = process.env['SUPERADMIN_USERNAME'] ?? 'svkenier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Método no permitido' });

  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  // Solo encargado+ puede eliminar usuarios
  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['encargado']) {
    return res.status(403).json({ error: 'No tienes permiso para eliminar usuarios' });
  }

  const { target_username } = req.body as { target_username?: string };

  if (!target_username) {
    return res.status(400).json({ error: 'Falta target_username' });
  }

  // Inmunidad del superadmin principal
  if (target_username === SUPERADMIN_USERNAME) {
    return res.status(403).json({ error: 'El superadmin principal no puede ser eliminado' });
  }

  // No eliminarse a sí mismo
  if (target_username === payload.sub) {
    return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
  }

  const targetUser = await getUser(target_username);

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Verificar jerarquía
  if (!canManage(payload.role, targetUser.role)) {
    return res.status(403).json({ error: 'No puedes eliminar a un usuario con ese rol' });
  }

  await deleteUser(target_username);

  return res.status(200).json({ ok: true });
}
