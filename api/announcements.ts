import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from './_lib/auth.js';
import { getFile, getFileWithETag, putFile, deleteFile, announcementImgPath, cdnImageUrl, ANNOUNCEMENTS_JSON_PATH, announcementJsonPath } from './_lib/github.js';
import { ROLE_LEVEL } from '../src/types/user.js';
import type { Announcement, AnnouncementUpsertBody } from '../src/types/announcement.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: Público (Retorna todos, pero en Home filtraremos por is_active)
  if (req.method === 'GET') {
    try {
      const ifNoneMatch = req.headers['if-none-match'];
      const ghRes = await getFileWithETag(ANNOUNCEMENTS_JSON_PATH, ifNoneMatch);

      if (ghRes.notModified) {
        return res.status(304).end();
      }

      if (ghRes.etag) {
        res.setHeader('ETag', ghRes.etag);
      }

      let announcements: Announcement[] = [];
      if (ghRes.data) {
        try {
          const parsed = JSON.parse(Buffer.from(ghRes.data.content, 'base64').toString('utf-8'));
          announcements = Array.isArray(parsed) ? parsed : (parsed.announcements || []);
        } catch {
          announcements = [];
        }
      }
      return res.status(200).json(announcements);
    } catch (err) {
      console.error('[GET /api/announcements] Error:', err);
      return res.status(500).json({ error: 'Error al obtener anuncios' });
    }
  }

  // Las siguientes rutas requieren auth de admin o superadmin
  const payload = await getAuthPayload(req);
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

    const announcementsFile = await getFile(ANNOUNCEMENTS_JSON_PATH);
    let announcements: Announcement[] = [];
    if (announcementsFile) {
      try {
        const parsed = JSON.parse(Buffer.from(announcementsFile.content, 'base64').toString('utf-8'));
        announcements = Array.isArray(parsed) ? parsed : (parsed.announcements || []);
      } catch {
        announcements = [];
      }
    }

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
    } else if (isUpdate && !finalImageUrl) {
      // El usuario eliminó la imagen existente
      try {
        const imgPath = announcementImgPath(id);
        const existingImg = await getFile(imgPath);
        if (existingImg) {
          await deleteFile(imgPath, existingImg.sha, `Remove announcement image for ${id}`);
        }
      } catch (err) {
        console.warn(`No se pudo eliminar imagen antigua del anuncio ${id}:`, err);
      }
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

    // Subir archivo JSON individual del anuncio
    const individualPath = announcementJsonPath(id);
    const existingIndividual = await getFile(individualPath);
    await putFile(
      individualPath,
      JSON.stringify(announcement, null, 2),
      `${isUpdate ? 'Update' : 'Add'} individual announcement JSON for ${id}`,
      existingIndividual?.sha
    );

    // Actualizar el array consolidado
    if (isUpdate) {
      const index = announcements.findIndex(a => a.id === id);
      if (index >= 0) {
        announcements[index] = announcement;
      } else {
        // En caso de que se haya corrompido el index pero no el archivo, lo añadimos
        announcements.unshift(announcement);
      }
    } else {
      announcements.unshift(announcement); // Los más recientes primero
    }

    // Subir el archivo JSON consolidado
    await putFile(
      ANNOUNCEMENTS_JSON_PATH,
      JSON.stringify(announcements, null, 2),
      `${isUpdate ? 'Update' : 'Add'} announcement ${id} in master JSON`,
      announcementsFile?.sha
    );

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

    const announcementsFile = await getFile(ANNOUNCEMENTS_JSON_PATH);
    let announcements: Announcement[] = [];
    if (announcementsFile) {
      try {
        const parsed = JSON.parse(Buffer.from(announcementsFile.content, 'base64').toString('utf-8'));
        announcements = Array.isArray(parsed) ? parsed : (parsed.announcements || []);
      } catch {
        announcements = [];
      }
    }

    const index = announcements.findIndex(a => a.id === id);
    if (index >= 0) {
      announcements.splice(index, 1);
      
      // Subir el archivo consolidado actualizado
      await putFile(
        ANNOUNCEMENTS_JSON_PATH,
        JSON.stringify(announcements, null, 2),
        `Delete announcement ${id} from master JSON`,
        announcementsFile?.sha
      );
    }

    // Eliminar archivo JSON individual
    try {
      const individualPath = announcementJsonPath(id);
      const existingIndividual = await getFile(individualPath);
      if (existingIndividual) {
        await deleteFile(individualPath, existingIndividual.sha, `Delete individual announcement JSON for ${id}`);
      }
    } catch (err) {
      console.warn(`No se pudo eliminar el JSON individual para anuncio ${id}:`, err);
    }

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
