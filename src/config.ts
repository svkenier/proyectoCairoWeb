/**
 * Configuración global de la aplicación petRescue.
 *
 * Variables de entorno VITE_* requeridas en .env (no son secretas —
 * el repositorio de mascotas es público y se consume vía CDN):
 *   VITE_GITHUB_OWNER  — usuario u organización de GitHub
 *   VITE_GITHUB_REPO   — nombre del repositorio de datos
 *   VITE_WHATSAPP_PHONE — número institucional (definido en utils/whatsapp.ts)
 */

const OWNER  = import.meta.env['VITE_GITHUB_OWNER']  as string | undefined ?? '';
const REPO   = import.meta.env['VITE_GITHUB_REPO']   as string | undefined ?? '';
const BRANCH = 'main';

/**
 * Base URL del CDN jsDelivr para el repositorio público de mascotas.
 * Ejemplo: https://cdn.jsdelivr.net/gh/miorg/refugio-data@main
 */
export const CDN_BASE =
  OWNER && REPO
    ? `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}`
    : '';

/** URL del índice compilado de mascotas (generado por GitHub Actions). */
export const PETS_INDEX_URL = `${CDN_BASE}/dist/mascotas-index.json`;

/**
 * URL de la imagen principal de una mascota en el CDN.
 * Formato de archivo: `images/pet-{id}.webp`
 */
export const petImageUrl = (id: string): string =>
  `${CDN_BASE}/images/${id}.webp`;

/**
 * URL de una foto secundaria de una mascota en el CDN.
 * Formato: `images/pet-{id}-extra-{n}.webp`
 */
export const petExtraImageUrl = (id: string, n: number): string =>
  `${CDN_BASE}/images/${id}-extra-${n}.webp`;

/**
 * URL del archivo JSON individual de una mascota en el CDN.
 * Se usa en PetDetail para carga directa sin depender del índice.
 */
export const petDataUrl = (id: string): string =>
  `${CDN_BASE}/data/${id}.json`;

/** Fallback visual cuando una imagen no carga (CDN unavailable o foto no subida aún). */
export const PET_IMAGE_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23F3F4F6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='64'%3E🐾%3C/text%3E%3C/svg%3E";
