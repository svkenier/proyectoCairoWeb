import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGlobalSettings, deleteGlobalSettings } from './_lib/kv.js';
import { getAuthPayload } from './_lib/auth.js';
import { getFile, getFileWithETag, putFile, SHELTER_INFO_PATH } from './_lib/github.js';
import { ROLE_LEVEL } from '../src/types/user.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Preflight
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: Público
  if (req.method === 'GET') {
    try {
      // 1. Try to fetch from GitHub with ETag
      const ifNoneMatch = req.headers['if-none-match'];
      const ghRes = await getFileWithETag(SHELTER_INFO_PATH, ifNoneMatch);

      if (ghRes.notModified) {
        return res.status(304).end();
      }

      if (ghRes.etag) {
        res.setHeader('ETag', ghRes.etag);
      }

      let settings: any = null;

      if (ghRes.data) {
        settings = JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8'));
      } else {
        // Migration logic: if GitHub file doesn't exist, try Redis
        const redisSettings = await getGlobalSettings();
        if (redisSettings) {
          settings = redisSettings;
          // Optionally, we could save it to GitHub right now, but since GET is public, 
          // we might just return it and let the admin save it later to avoid public users
          // triggering GitHub commits.
        }
      }

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
      
      if (!newSettings || typeof newSettings !== 'object') {
        return res.status(400).json({ error: 'El cuerpo de la petición debe ser un objeto.' });
      }

      // Check current GitHub file to get SHA
      const currentFile = await getFile(SHELTER_INFO_PATH);
      
      await putFile(
        SHELTER_INFO_PATH,
        JSON.stringify(newSettings, null, 2),
        `Update shelter settings`,
        currentFile?.sha
      );

      // Clean up Redis if it still exists
      try {
        await deleteGlobalSettings();
      } catch (e) {
        console.warn('Could not delete Redis settings', e);
      }

      return res.status(200).json({ message: 'Configuración actualizada con éxito.', settings: newSettings });
    } catch (err) {
      console.error('[PUT /api/settings] Error:', err);
      return res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
