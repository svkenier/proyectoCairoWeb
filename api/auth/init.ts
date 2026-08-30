import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUser, setUser } from '../_lib/kv.js';
import type { KVUser } from '../../src/types/user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Verificar la llave de rescate para autorizar esta inicialización
  const { rescue_key } = req.body as { rescue_key?: string };
  const masterKey = process.env['MASTER_RESCUE_KEY'];

  if (!masterKey || rescue_key !== masterKey) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const superAdminUsername = process.env['SUPERADMIN_USERNAME'] || 'svkenier';
  const superAdminHash = process.env['ADMIN_PASSWORD_HASH'];

  if (!superAdminHash) {
    return res.status(500).json({ error: 'Falta configurar ADMIN_PASSWORD_HASH en el entorno' });
  }

  const existing = await getUser(superAdminUsername);
  if (existing) {
    return res.status(400).json({ error: 'El superadmin ya existe' });
  }

  const superadmin: KVUser = {
    username: superAdminUsername,
    password_hash: superAdminHash,
    role: 'superadmin',
    created_by: 'system',
    created_at: new Date().toISOString(),
  };

  await setUser(superadmin); // Guardar de forma persistente

  return res.status(200).json({ ok: true, message: 'SuperAdmin inicializado correctamente' });
}
