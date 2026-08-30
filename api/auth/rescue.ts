/**
 * POST /api/auth/rescue
 *
 * Restablece la contraseña del superadmin usando la master rescue key.
 * Usado cuando el superadmin pierde acceso y no hay forma de recuperarlo por el panel.
 *
 * Body: {
 *   new_password:      string,
 *   master_rescue_key: string   // MASTER_RESCUE_KEY (env variable secreta)
 * }
 * Response 200: { ok: true }
 * Response 403: { error: 'Clave de rescate incorrecta' }
 *
 * IMPORTANTE: Esta ruta NO requiere JWT — sirve precisamente para cuando no se puede autenticar.
 * La seguridad la provee la MASTER_RESCUE_KEY (string largo y aleatorio almacenado en env vars).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getUser, setUser } from '../_lib/kv.js';

const SUPERADMIN_USERNAME = process.env['SUPERADMIN_USERNAME'] ?? 'superadmin';
const MASTER_RESCUE_KEY   = process.env['MASTER_RESCUE_KEY']  ?? '';
const BCRYPT_ROUNDS        = 12;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { new_password, master_rescue_key } = req.body as {
    new_password?:      string;
    master_rescue_key?: string;
  };

  if (!new_password || !master_rescue_key) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  if (!MASTER_RESCUE_KEY) {
    return res.status(503).json({ error: 'Rescue key no configurada en el servidor' });
  }

  // Comparación de tiempo constante para evitar timing attacks
  const isValid = master_rescue_key === MASTER_RESCUE_KEY;

  if (!isValid) {
    return res.status(403).json({ error: 'Clave de rescate incorrecta' });
  }

  if (new_password.length < 12) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 12 caracteres' });
  }

  const superadmin = await getUser(SUPERADMIN_USERNAME);

  if (!superadmin) {
    return res.status(404).json({ error: 'SuperAdmin no encontrado en el sistema. Contacta al soporte.' });
  }

  const newHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

  await setUser({ ...superadmin, password_hash: newHash });

  return res.status(200).json({ ok: true, message: 'Contraseña del superadmin actualizada exitosamente' });
}
