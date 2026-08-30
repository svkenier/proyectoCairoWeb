import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from './_lib/auth.js';
import { getAnnouncements, setAnnouncements } from './_lib/kv.js';
import { getFile, putFile, deleteFile, announcementImgPath, cdnImageUrl } from './_lib/github.js';
import { ROLE_LEVEL } from '../src/types/user.js';
import type { Announcement, AnnouncementUpsertBody } from '../src/types/announcement.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: Público (Retorna todos, pero en Home filtraremos por is_active)
  if (req.method === 'GET') {
    try {
      const announcements = await getAnnouncements();
      return res.status(200).json(announcements);
    } catch (err) {
      console.error('[GET /api/announcements] Error:', err);
      return res.status(500).json({ error: 'Error al obtener anuncios' });
    }
  }

  // Las siguientes rutas requieren auth de admin o superadmin
  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['encargado']) {
    return res.status(403).json({ error: 'Se requieren permisos de encargado o superior' });
  }

  if (req.method === 'POST') return handleUpsert(req, res, false);
  if (req.method === 'PUT') return handleUpsert(req, res, true);
  if (req.method === 'DELETE') return handleDelete(req, res);

  return res.status(405).json({ error: 'Método no permitido' });
}

async function handleUpsert(req: VercelRequest, res: VercelResponse, isUpdate: boolean) {
  try {
    const body = req.body as AnnouncementUpsertBody;
    
    if (!body.title?.trim() || !body.description?.trim()) {
      return res.status(400).json({ error: 'Título y descripción son requeridos' });
    }

    const announcements = (await getAnnouncements()) as Announcement[];
    const now = new Date().toISOString();
    
    // Generar ID o usar el existente
    const id = body.id || `announcement-${Date.now()}`;
    let finalImageUrl = body.image_url || '';

    // Si hay una nueva imagen en base64, subirla a Github
    if (body.image_base64) {
      const imgPath = announcementImgPath(id);
      const existingImg = await getFile(imgPath);
      await putFile(
        imgPath,
        body.image_base64,
        `${isUpdate ? 'Update' : 'Add'} announcement image for ${id}`,
        existingImg?.sha
      );
      finalImageUrl = cdnImageUrl(imgPath);
    }

    const announcement: Announcement = {
      id,
      title: body.title.trim(),
      type: body.type || 'general',
      description: body.description.trim(),
      date: body.date || now.split('T')[0],
      time: body.time || '',
      location: body.location || '',
      image_url: finalImageUrl,
      is_active: body.is_active ?? true,
      created_at: isUpdate ? (announcements.find(a => a.id === id)?.created_at || now) : now,
      updated_at: now,
    };

    if (isUpdate) {
      const index = announcements.findIndex(a => a.id === id);
      if (index >= 0) {
        announcements[index] = announcement;
      } else {
        return res.status(404).json({ error: 'Anuncio no encontrado' });
      }
    } else {
      announcements.unshift(announcement); // Los más recientes primero
    }

    await setAnnouncements(announcements);
    return res.status(isUpdate ? 200 : 201).json({ ok: true, announcement });
  } catch (err) {
    console.error(`[handleUpsert /api/announcements] Error:`, err);
    return res.status(500).json({ error: 'Error interno guardando anuncio' });
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  try {
    const { id } = req.body as { id: string };
    if (!id) return res.status(400).json({ error: 'ID es requerido' });

    let announcements = (await getAnnouncements()) as Announcement[];
    const index = announcements.findIndex(a => a.id === id);
    
    if (index < 0) return res.status(404).json({ error: 'Anuncio no encontrado' });

    announcements.splice(index, 1);
    await setAnnouncements(announcements);

    // Intentar eliminar la imagen de GitHub (no es fatal si falla o no existe)
    try {
      const imgPath = announcementImgPath(id);
      const existingImg = await getFile(imgPath);
      if (existingImg) {
        await deleteFile(imgPath, existingImg.sha, `Delete announcement image for ${id}`);
      }
    } catch (imgErr) {
      console.warn(`No se pudo eliminar imagen para anuncio ${id}:`, imgErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(`[DELETE /api/announcements] Error:`, err);
    return res.status(500).json({ error: 'Error interno eliminando anuncio' });
  }
}
