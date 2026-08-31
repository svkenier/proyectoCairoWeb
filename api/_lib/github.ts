/**
 * Utilidades para la GitHub Contents API.
 *
 * Gestiona la base de datos de mascotas almacenada en el repositorio público:
 *   /data/pets.json         → JSON maestro de mascotas
 *   /data/shelter-info.json → Configuración global del refugio
 *   /images/pets/{id}.webp  → foto principal
 *   /images/pets/{id}-extra-{n}.webp → fotos secundarias
 *
 * Variables de entorno requeridas (backend-only):
 *   GITHUB_TOKEN   — Personal Access Token con permisos repo
 *   GITHUB_OWNER   — Propietario del repositorio
 *   GITHUB_REPO    — Nombre del repositorio
 *   GITHUB_BRANCH  — Rama (default: main)
 */

const GITHUB_TOKEN  = process.env['GITHUB_TOKEN']  ?? '';
const GITHUB_OWNER  = process.env['GITHUB_OWNER']  ?? '';
const GITHUB_REPO   = process.env['GITHUB_REPO']   ?? '';
const GITHUB_BRANCH = process.env['GITHUB_BRANCH'] ?? 'main';

const GH_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;

const GH_HEADERS = {
  'Authorization':       `token ${GITHUB_TOKEN}`,
  'Accept':              'application/vnd.github+json',
  'Content-Type':        'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
};

// ─── Tipos internos ───────────────────────────────────────────────────────────

export interface GHFileInfo {
  sha:     string;
  content: string; // base64 encoded
  name:    string;
  path:    string;
}

// ─── Helper genérico de petición ─────────────────────────────────────────────

async function ghRequest<T = unknown>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${GH_BASE}/${path}`, {
    method,
    headers: GH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const json = await response.json() as Record<string, unknown>;

  if (!response.ok) {
    throw new Error((json['message'] as string) ?? `GitHub API error: ${response.status}`);
  }

  return json as T;
}

// ─── Operaciones de archivo ───────────────────────────────────────────────────

/**
 * Obtiene información de un archivo (SHA + contenido en base64).
 * Retorna null si el archivo no existe (404).
 */
export async function getFile(path: string): Promise<GHFileInfo | null> {
  try {
    return await ghRequest<GHFileInfo>('GET', path);
  } catch (err) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes('Not Found') || msg.includes('This repository is empty')) {
        return null;
      }
    }
    throw err;
  }
}

/**
 * Crea o actualiza un archivo en GitHub.
 * @param path     - Ruta relativa al repositorio (sin slash inicial).
 * @param content  - Contenido en base64 o texto plano (se auto-codifica si no es base64).
 * @param message  - Mensaje de commit.
 * @param sha      - SHA del archivo existente (requerido para actualizaciones).
 */
export async function putFile(
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<void> {
  // Si el contenido no es base64, codificarlo
  const base64Content = isBase64(content)
    ? content
    : Buffer.from(content).toString('base64');

  await ghRequest('PUT', path, {
    message,
    content: base64Content,
    branch:  GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  });
}

/**
 * Elimina un archivo de GitHub usando su SHA.
 * @param path    - Ruta del archivo.
 * @param sha     - SHA actual del archivo.
 * @param message - Mensaje de commit.
 */
export async function deleteFile(
  path: string,
  sha: string,
  message: string,
): Promise<void> {
  await ghRequest('DELETE', path, { message, sha, branch: GITHUB_BRANCH });
}

// ─── Helpers específicos de mascotas ─────────────────────────────────────────

/** Rutas a los JSON maestros. */
export const PETS_JSON_PATH = 'data/pets.json';
export const petJsonPath = (id: string) => `data/pets/${id}.json`;
export const SHELTER_INFO_PATH = 'data/shelter-info.json';

/** Ruta de la imagen principal de una mascota. */
export const petMainImgPath = (id: string) => `images/pets/${id}.webp`;

/** Ruta de una imagen secundaria de una mascota. */
export const petExtraImgPath = (id: string, n: number) => `images/pets/${id}-extra-${n}.webp`;

/** Ruta a los JSON de anuncios */
export const ANNOUNCEMENTS_JSON_PATH = 'data/announcements.json';
export const announcementJsonPath = (id: string) => `data/announcements/${id}.json`;

/** Ruta de una imagen de anuncio/evento. */
export const announcementImgPath = (id: string) => `images/announcements/${id}.webp`;

/** URL pública CDN jsDelivr para una imagen. */
export const cdnImageUrl = (relativePath: string) =>
  `https://cdn.jsdelivr.net/gh/${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}/${relativePath}`;

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Verifica heurísticamente si una cadena parece base64. */
function isBase64(str: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(str.replace(/\s/g, ''));
}

/** Genera un ID de mascota único basado en timestamp. */
export function generatePetId(): string {
  return `pet-${Date.now()}`;
}
