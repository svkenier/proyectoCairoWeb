import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSettings, setGlobalSettings } from './_lib/kv.js';
import { getAuthPayload } from './_lib/auth.js';
import { ROLE_LEVEL } from '../src/types/user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: Público
  if (req.method === 'GET') {
    try {
      const settings = await getGlobalSettings();
      // En caso de que sea null, el frontend usará DEFAULT_SETTINGS (o podemos enviarlas desde aquí)
      return res.status(200).json(settings || {});
    } catch (err) {
      console.error('[GET /api/settings] Error:', err);
      return res.status(500).json({ error: 'Error al obtener configuración' });
    }
  }

  // PUT: Protegido (solo superadmin)
  if (req.method === 'PUT') {
    const auth = await getAuthPayload(req);
    if (!auth) {
      return res.status(401).json({ error: 'No autorizado. Token inválido o ausente.' });
    }

    if (ROLE_LEVEL[auth.role] < ROLE_LEVEL['superadmin']) {
      return res.status(403).json({ error: 'Prohibido. Se requieren permisos de Superadmin.' });
    }

    try {
      const newSettings = req.body;
      
      // Validación básica
      if (!newSettings || typeof newSettings !== 'object') {
        return res.status(400).json({ error: 'El cuerpo de la petición debe ser un objeto.' });
      }

      await setGlobalSettings(newSettings);
      
      return res.status(200).json({ message: 'Configuración actualizada con éxito.', settings: newSettings });
    } catch (err) {
      console.error('[PUT /api/settings] Error:', err);
      return res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
