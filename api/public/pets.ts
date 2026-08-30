/**
 * GET /api/public/pets
 *
 * Endpoint público rápido que sirve el catálogo de mascotas leyendo
 * desde la caché de Redis. Si la caché está vacía, lee del repositorio 
 * directamente (usado como fallback o prime de la caché).
 * Aplica Rate Limiting para evitar abusos.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFile, PETS_JSON_PATH } from '../_lib/github.js';
import { getPetsCache, setPetsCache } from '../_lib/kv.js';
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
    // 1. Intentar desde Redis
    const cached = await getPetsCache();
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json({ mascotas: cached });
    }

    // 2. Fallback a GitHub
    res.setHeader('X-Cache', 'MISS');
    const file = await getFile(PETS_JSON_PATH);
    
    let pets = [];
    if (file) {
      pets = JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8'));
    }

    // 3. Guardar en Caché
    await setPetsCache(pets);

    return res.status(200).json({ mascotas: pets });
  } catch (err) {
    console.error('Error in public/pets:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
