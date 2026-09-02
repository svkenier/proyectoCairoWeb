/**
 * GET /api/public/pets
 *
 * Endpoint público rápido que sirve el catálogo de mascotas leyendo
 * desde la caché de Redis. Si la caché está vacía, lee del repositorio 
 * directamente (usado como fallback o prime de la caché).
 * Aplica Rate Limiting para evitar abusos.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFileWithETag, PETS_JSON_PATH } from '../_lib/github.js';
import { publicRateLimit, checkRateLimit } from '../_lib/rate-limit.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  // Rate limit
  const ip = req.headers['x-forwarded-for'] as string ?? '127.0.0.1';
  const limitRes = await checkRateLimit(publicRateLimit, ip);
  
  res.setHeader('X-RateLimit-Limit', limitRes.limit);
  res.setHeader('X-RateLimit-Remaining', limitRes.remaining);
  
  if (!limitRes.success) {
    return res.status(429).json({ error: 'Demasiadas peticiones. Intenta más tarde.' });
  }

  try {
    const ifNoneMatch = req.headers['if-none-match'];
    const ghRes = await getFileWithETag(PETS_JSON_PATH, ifNoneMatch);

    if (ghRes.notModified) {
      return res.status(304).end();
    }

    if (ghRes.etag) {
      res.setHeader('ETag', ghRes.etag);
    }

    let pets = [];
    if (ghRes.data) {
      try {
        pets = JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8'));
      } catch {
        pets = [];
      }
    }

    return res.status(200).json({ mascotas: pets });
  } catch (err) {
    console.error('Error in public/pets:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
