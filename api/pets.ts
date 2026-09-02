/**
 * /api/pets — CRUD de mascotas contra el repositorio GitHub.
 *
 * POST   /api/pets  → Crea o actualiza una mascota (+ sube imágenes)
 * DELETE /api/pets  → Elimina mascota y sus imágenes de GitHub
 *
 * Autenticación requerida (mínimo voluntario).
 * Las imágenes se reciben como base64 WebP (ya optimizadas en el cliente).
 *
 * Después de cada escritura en GitHub, un GitHub Actions workflow
 * regenera el archivo mascotas-index.json (< 30 s).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuthPayload } from './_lib/auth.js';
import {
  getFile, putFile, deleteFile,
  PETS_JSON_PATH, petJsonPath, petMainImgPath, petExtraImgPath,
  cdnImageUrl, generatePetId,
} from './_lib/github.js';
import { ROLE_LEVEL } from '../src/types/user.js';
import type { Pet } from '../src/types/pet.js';

// ─── Tipos de request body ────────────────────────────────────────────────────

interface PetUpsertBody {
  id?:                         string;   // undefined = crear nuevo
  nombre:                      string;
  especie?:                    string;
  raza?:                       string;
  sexo?:                       string;
  tamano?:                     string;
  edad_aproximada?:            string;
  peso_kg?:                    number;
  vacunado?:                   boolean;
  esterilizado?:               boolean;
  desparasitado?:              boolean;
  descripcion?:                string;
  estado?:                     string;
  destacado?:                  boolean;
  // Imágenes en base64 WebP
  imagen_principal_base64?:    string;
  fotos_secundarias_base64?:   string[];
  // URLs de fotos secundarias existentes a conservar
  fotos_secundarias_existing?: string[];
}

interface PetDeleteBody {
  id: string;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = await getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autenticado' });

  if (ROLE_LEVEL[payload.role] < ROLE_LEVEL['voluntario']) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (req.method === 'POST') return handleUpsert(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);

  return res.status(405).json({ error: 'Método no permitido' });
}

// ─── Crear / Actualizar ───────────────────────────────────────────────────────

async function handleUpsert(req: VercelRequest, res: VercelResponse) {
  try {
    const body = req.body as PetUpsertBody;

  if (!body.nombre?.trim()) {
    return res.status(400).json({ error: 'El campo nombre es requerido' });
  }

  const isUpdate = Boolean(body.id);
  const petId    = body.id ?? generatePetId();

  // ── 1. Obtener el archivo monolítico completo ──────────────────────────────
  const petsFile = await getFile(PETS_JSON_PATH);
  let petsArray: Pet[] = [];
  
  if (petsFile) {
    petsArray = JSON.parse(Buffer.from(petsFile.content, 'base64').toString('utf-8'));
  }

  const existingPetIndex = petsArray.findIndex(p => p.id === petId);
  const existingPet = existingPetIndex >= 0 ? petsArray[existingPetIndex] : null;

  // ── 2. Subir imagen principal (si viene nueva) ─────────────────────────────
  let imagenPrincipalUrl = existingPet?.imagen_principal ?? '';

  if (body.imagen_principal_base64) {
    const imgPath = petMainImgPath(petId);
    const existingImg = await getFile(imgPath);
    await putFile(
      imgPath,
      body.imagen_principal_base64,
      `${isUpdate ? 'Update' : 'Add'} main image for ${petId}`,
      existingImg?.sha,
    );
    imagenPrincipalUrl = cdnImageUrl(imgPath);
  }

  // ── 3. Subir fotos secundarias nuevas ──────────────────────────────────────
  const existingSecondary = body.fotos_secundarias_existing ?? existingPet?.fotos_secundarias ?? [];
  const newSecondaryUrls: string[] = [];

  if (body.fotos_secundarias_base64?.length) {
    for (let i = 0; i < body.fotos_secundarias_base64.length; i++) {
      const imgPath = petExtraImgPath(petId, existingSecondary.length + i + 1);
      const existingImg = await getFile(imgPath);
      await putFile(
        imgPath,
        body.fotos_secundarias_base64[i],
        `Add extra image ${i + 1} for ${petId}`,
        existingImg?.sha,
      );
      newSecondaryUrls.push(cdnImageUrl(imgPath));
    }
  }

  // ── 4. Construir objeto Pet ────────────────────────────────────────────────
  const now = new Date().toISOString();

  const pet: Pet = {
    ...(existingPet ?? {}),
    id:                 petId,
    nombre:             body.nombre.trim(),
    especie:            (body.especie as Pet['especie'])        ?? existingPet?.especie,
    raza:               body.raza           ?? existingPet?.raza,
    sexo:               (body.sexo as Pet['sexo'])           ?? existingPet?.sexo,
    tamano:             (body.tamano as Pet['tamano'])         ?? existingPet?.tamano,
    edad_aproximada:    body.edad_aproximada ?? existingPet?.edad_aproximada,
    peso_kg:            body.peso_kg        ?? existingPet?.peso_kg,
    vacunado:           body.vacunado       ?? existingPet?.vacunado,
    esterilizado:       body.esterilizado   ?? existingPet?.esterilizado,
    desparasitado:      body.desparasitado  ?? existingPet?.desparasitado,
    descripcion:        body.descripcion    ?? existingPet?.descripcion ?? '',
    estado:             (body.estado as Pet['estado'])   ?? existingPet?.estado   ?? 'disponible',
    destacado:          body.destacado      ?? existingPet?.destacado   ?? false,
    imagen_principal:   imagenPrincipalUrl,
    fotos_secundarias:  [...existingSecondary, ...newSecondaryUrls],
    created_at:         existingPet?.created_at ?? now,
    updated_at:         now,
  };

  // ── 5. Actualizar el array y Guardar JSON en GitHub ────────────────────────
  if (existingPetIndex >= 0) {
    petsArray[existingPetIndex] = pet;
  } else {
    petsArray.push(pet);
  }

  // Subir archivo JSON individual de la mascota
  const individualPath = petJsonPath(petId);
  const existingIndividual = await getFile(individualPath);
  await putFile(
    individualPath,
    JSON.stringify(pet, null, 2),
    `${isUpdate ? 'Update' : 'Add'} individual pet JSON for ${petId}`,
    existingIndividual?.sha
  );

  const petJsonStr = JSON.stringify(petsArray, null, 2);
  await putFile(
    PETS_JSON_PATH,
    Buffer.from(petJsonStr).toString('base64'),
    `${isUpdate ? 'Update' : 'Add'} pet ${petId}: ${pet.nombre} in master JSON`,
    petsFile?.sha,
  );

    return res.status(isUpdate ? 200 : 201).json({ ok: true, pet });
  } catch (err) {
    console.error('❌ [handleUpsert] Error inesperado:', err);
    if (err instanceof Error) {
      console.error('Stack trace:', err.stack);
    }
    return res.status(500).json({ error: 'Error interno guardando la mascota', details: err instanceof Error ? err.message : String(err) });
  }
}

// ─── Eliminar ─────────────────────────────────────────────────────────────────

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const { id } = req.body as PetDeleteBody;

  if (!id) {
    return res.status(400).json({ error: 'El campo id es requerido' });
  }

  const petsFile = await getFile(PETS_JSON_PATH);
  if (!petsFile) {
    return res.status(404).json({ error: 'Archivo de mascotas no encontrado' });
  }

  let petsArray: Pet[] = JSON.parse(Buffer.from(petsFile.content, 'base64').toString('utf-8'));
  
  const petIndex = petsArray.findIndex(p => p.id === id);
  if (petIndex < 0) {
    return res.status(404).json({ error: 'Mascota no encontrada en el repositorio' });
  }

  const pet = petsArray[petIndex];

  // Eliminar del array
  petsArray.splice(petIndex, 1);

  // Actualizar el JSON
  const petJsonStr = JSON.stringify(petsArray, null, 2);
  await putFile(
    PETS_JSON_PATH,
    Buffer.from(petJsonStr).toString('base64'),
    `Delete pet ${id}: ${pet?.nombre}`,
    petsFile.sha,
  );


  // Eliminar archivo JSON individual
  try {
    const individualPath = petJsonPath(id);
    const existingIndividual = await getFile(individualPath);
    if (existingIndividual) {
      await deleteFile(individualPath, existingIndividual.sha, `Delete individual pet JSON for ${id}`);
    }
  } catch (err) {
    console.warn(`No se pudo eliminar el JSON individual para la mascota ${id}:`, err);
  }

  // Eliminar imagen principal
  const mainImg = await getFile(petMainImgPath(id));
  if (mainImg) {
    await deleteFile(petMainImgPath(id), mainImg.sha, `Delete main image for ${id}`);
  }

  // Eliminar imágenes secundarias (máx 10 intentos)
  for (let n = 1; n <= 10; n++) {
    const extraImg = await getFile(petExtraImgPath(id, n));
    if (!extraImg) break;
    await deleteFile(petExtraImgPath(id, n), extraImg.sha, `Delete extra image ${n} for ${id}`);
  }

  return res.status(200).json({ ok: true });
}
