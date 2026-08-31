import 'dotenv/config';
import { getFile, deleteFile, ANNOUNCEMENTS_JSON_PATH } from '../api/_lib/github.js';
import type { Announcement } from '../src/types/announcement.js';

// Re-implementar un helper rápido para hacer llamadas directas al árbol de directorios de GitHub
async function listGithubDirectory(path: string) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  
  if (!token || !owner || !repo) {
    throw new Error('Faltan variables de entorno GITHUB_*');
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return response.json() as Promise<Array<{ name: string; path: string; sha: string; type: string }>>;
}

async function cleanupOrphanedImages() {
  console.log('--- Iniciando limpieza de imágenes huérfanas ---');

  // 1. Obtener JSON maestro
  const masterFile = await getFile(ANNOUNCEMENTS_JSON_PATH);
  if (!masterFile) {
    console.log('No se encontró data/announcements.json. Abortando.');
    return;
  }

  const announcements: Announcement[] = JSON.parse(Buffer.from(masterFile.content, 'base64').toString('utf-8'));
  const activeIds = new Set(announcements.map(a => a.id));
  
  console.log(`> Se encontraron ${activeIds.size} anuncios en el JSON consolidado.`);

  // 2. Obtener lista de imágenes en images/announcements/
  const imagesDir = 'images/announcements';
  const files = await listGithubDirectory(imagesDir);
  
  const imageFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.webp'));
  console.log(`> Se encontraron ${imageFiles.length} imágenes (.webp) en GitHub (${imagesDir}/).`);

  // 3. Comparar y eliminar
  let deletedCount = 0;
  for (const file of imageFiles) {
    // Extraer el ID (asumiendo formato: id.webp)
    const fileId = file.name.replace('.webp', '');
    
    if (!activeIds.has(fileId)) {
      console.log(`- Imagen huérfana detectada: ${file.name}. Eliminando...`);
      try {
        await deleteFile(file.path, file.sha, `fix: purgar imagenes huerfanas en images/announcements`);
        console.log(`  ✓ Eliminada exitosamente.`);
        deletedCount++;
      } catch (err) {
        console.error(`  ✗ Error al eliminar ${file.name}:`, err);
      }
    }
  }

  console.log('--- Limpieza finalizada ---');
  console.log(`> Imágenes eliminadas: ${deletedCount}`);
  console.log(`> Imágenes mantenidas: ${imageFiles.length - deletedCount}`);
}

cleanupOrphanedImages().catch(console.error);
