/**
 * POST /api/users/create
 *
 * Crea un nuevo usuario en Vercel KV.
 * Requiere rol mínimo: encargado (puede crear voluntarios).
 * SuperAdmin puede crear cualquier rol.
 *
 * Headers: Authorization: Bearer <token>
 * Body: { username: string, password: string, role: 'voluntario' | 'encargado' | 'superadmin' }
 * Response 201: { ok: true, user: PublicUser }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { getAuthPayload } from '../auth.js';
import { userExists, setUser } from '../kv.js';
import { ROLE_LEVEL, canCreateRole } from '../../../src/types/user.js';
import type { UserRole, KVUser, PublicUser } from '../../../src/types/user.js';

const BCRYPT_ROUNDS = 12;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // Autenticación
  const payload = await getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  // Solo encargado+ puede crear usuarios
  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['encargado']) {
    return res.status(403).json({ error: 'No tienes permiso para crear usuarios' });
  }

  const { username, password, role } = req.body as {
    username?: string;
    password?: string;
    role?:     UserRole;
  };

  // Validaciones
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Faltan campos: username, password, role' });
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (!/^[a-z0-9_]{2,32}$/.test(normalizedUsername)) {
    return res.status(400).json({ error: 'Username debe ser 2-32 caracteres alfanuméricos o _' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  if (!['voluntario', 'encargado', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  // Verificar jerarquía: ¿puede el actor crear este rol?
  if (!canCreateRole(payload.role, role)) {
    return res.status(403).json({ error: 'No puedes crear un usuario con ese rol' });
  }

  // Verificar que el username no exista
  if (await userExists(normalizedUsername)) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese nombre' });
  }

  // Hashear contraseña y guardar
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const now = new Date().toISOString();
  const newUser: KVUser = {
    username:      normalizedUsername,
    role,
    password_hash,
    created_by:    payload.sub,
    created_at:    now,
    last_login:    null,
  };

  await setUser(newUser);

  const { password_hash: _ph, ...publicUser } = newUser;

  return res.status(201).json({ ok: true, user: publicUser as PublicUser });
}
