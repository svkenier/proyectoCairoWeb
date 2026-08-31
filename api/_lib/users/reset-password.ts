/**
 * POST /api/users/reset-password
 *
 * Restablece la contraseña de un usuario existente.
 * - SuperAdmin puede resetear cualquier usuario.
 * - Encargado puede resetear voluntarios.
 * - Voluntarios no pueden resetear contraseñas.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { target_username: string, new_password: string }
 * Response 200: { ok: true }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAuthPayload } from '../auth.js';
import { getUser, setUser } from '../kv.js';
import { ROLE_LEVEL, canManage } from '../../../src/types/user.js';

const BCRYPT_ROUNDS        = 12;
const SUPERADMIN_USERNAME  = process.env['SUPERADMIN_USERNAME'] ?? 'superadmin';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  // Solo encargado+ puede resetear contraseñas
  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['encargado']) {
    return res.status(403).json({ error: 'No tienes permiso para resetear contraseñas' });
  }

  const { target_username, new_password } = req.body as {
    target_username?: string;
    new_password?:    string;
  };

  if (!target_username || !new_password) {
    return res.status(400).json({ error: 'Faltan campos: target_username, new_password' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  const targetUser = await getUser(target_username);

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Verificar jerarquía — ¿puede el actor gestionar al target?
  if (!canManage(payload.role, targetUser.role) && payload.sub !== SUPERADMIN_USERNAME) {
    return res.status(403).json({ error: 'No puedes gestionar a un usuario con ese rol' });
  }

  const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

  await setUser({ ...targetUser, password_hash: newHash });

  return res.status(200).json({ ok: true });
}
