/**
 * POST /api/users/change-password
 *
 * Permite a cualquier usuario autenticado cambiar su propia contraseña,
 * siempre y cuando proporcione correctamente su contraseña actual.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { current_password: string, new_password: string }
 * Response 200: { ok: true }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAuthPayload } from '../auth.js';
import { getUser, updateUserPreservingTTL } from '../kv.js';

const BCRYPT_ROUNDS = 12;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const payload = await getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  const { current_password, new_password } = req.body as {
    current_password?: string;
    new_password?:     string;
  };

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Faltan campos: current_password, new_password' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  // Obtener el usuario actual
  const user = await getUser(payload.sub);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Verificar la contraseña actual
  const isValid = await bcrypt.compare(current_password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
  }

  // Hashear y guardar nueva contraseña incrementando tokenVersion
  const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
  const newTokenVersion = (user.tokenVersion || 1) + 1;
  await updateUserPreservingTTL(payload.sub, { password_hash: newHash, tokenVersion: newTokenVersion });

  return res.status(200).json({ ok: true });
}
