import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SUPERADMIN = process.env.SUPERADMIN_USERNAME || 'svkenier';

function base64url(str: string) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateToken(username: string, role: string, tokenVersion: number = 1) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: username, role, tokenVersion, exp: Math.floor(Date.now() / 1000) + 8 * 3600 };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${signatureInput}.${signature}`;
}

test.describe('Ciclo CRUD en Panel Administrativo (Real sobre staging)', () => {
  const testPassword = 'TestPassword123!';
  let testUser = '';

  const createdTestUsers: string[] = [];
  const createdTestPets: string[] = [];
  const createdTestAnnouncements: string[] = [];

  // Utilidad para limpiar usuarios de prueba
  async function cleanupUsers(requestCtx) {
    if (createdTestUsers.length === 0) return;
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    for (const user of createdTestUsers) {
      await requestCtx.delete('/api/users/delete', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { target_username: user }
      });
    }
  }

  // Utilidad para limpiar mascotas y anuncios de GitHub
  async function cleanupGitHubData(requestCtx) {
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    
    // Limpiar Mascotas
    for (const petId of createdTestPets) {
      await requestCtx.delete('/api/pets', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { id: petId }
      });
    }

    // Limpiar Anuncios
    for (const announcementId of createdTestAnnouncements) {
      await requestCtx.delete('/api/announcements', {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: { id: announcementId }
      });
    }
  }

  test.beforeEach(async ({ page, request }) => {
    // 1. Listen for ALL successful creations globally and register IDs automatically
    page.on('response', async (response) => {
      if (response.request().method() === 'POST' && response.status() === 201) {
        const url = response.url();
        if (url.includes('/api/pets')) {
          try {
            const data = await response.json();
            if (data.pet?.id && !createdTestPets.includes(data.pet.id)) {
              createdTestPets.push(data.pet.id);
            }
          } catch (e) {}
        } else if (url.includes('/api/announcements')) {
          try {
            const data = await response.json();
            if (data.announcement?.id && !createdTestAnnouncements.includes(data.announcement.id)) {
              createdTestAnnouncements.push(data.announcement.id);
            }
          } catch (e) {}
        }
      }
    });

    testUser = `admin_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    
    // Crear el usuario admin para la prueba
    const res = await request.post('/api/users/create', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { username: testUser, password: testPassword, role: 'encargado' }
    });
    
    if (res.ok()) {
      if (!createdTestUsers.includes(testUser)) createdTestUsers.push(testUser);
    } else {
      console.log('Error creating test admin user:', await res.text());
    }
    expect(res.ok()).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    try {
      await cleanupGitHubData(request);
      await cleanupUsers(request);
    } finally {
      createdTestUsers.length = 0;
      createdTestPets.length = 0;
      createdTestAnnouncements.length = 0;
    }
  });

  test('Permite crear y luego visualizar una mascota y anuncio en entorno real', async ({ page }) => {
    test.setTimeout(120000); // Dar más tiempo para las operaciones reales contra la API de GitHub

    // 1. Iniciar sesión con el usuario real de prueba
    await page.goto('/login');
    await page.getByLabel(/Usuario/i).fill(testUser);
    await page.getByLabel(/Contraseña/i).fill(testPassword);
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Debe llevarnos al panel admin
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Panel de Administración/i })).toBeVisible();

    // 2. Crear una Mascota (Real API)
    const uniquePetName = `Firulais Test ${Date.now()}`;
    await page.getByRole('button', { name: /Nueva mascota/i }).click();
    await page.getByLabel(/Nombre \*/i).fill(uniquePetName);
    await page.getByRole('combobox', { name: /Especie/i }).click();
    await page.getByRole('option', { name: 'Perro' }).click();
    await page.getByRole('combobox', { name: /Sexo/i }).click();
    await page.getByRole('option', { name: 'Macho' }).click();
    
    // Esperar a que la petición a GitHub termine exitosamente
    const createPetPromise = page.waitForResponse(res => res.url().includes('/api/pets') && res.status() === 201);
    await page.getByRole('button', { name: /Crear mascota/i }).click();
    await createPetPromise;

    // Verificar que aparece en la tabla/UI
    await expect(page.getByText(uniquePetName).first()).toBeAttached({ timeout: 20000 });

    // 3. Cambiar a Pestaña Anuncios
    await page.getByRole('tab', { name: /Eventos y Anuncios/i }).click();

    // 4. Crear Anuncio (Real API)
    const uniqueAnnouncementTitle = `Jornada de Adopción Test ${Date.now()}`;
    await page.getByRole('button', { name: /Nuevo Anuncio/i }).click();
    await page.getByLabel(/Título/i).fill(uniqueAnnouncementTitle);
    await page.getByLabel(/Descripción/i).fill('Ven a adoptar a tu nuevo mejor amigo.');

    const createAnnouncePromise = page.waitForResponse(res => res.url().includes('/api/announcements') && res.status() === 201);
    await page.getByRole('button', { name: /Crear anuncio/i }).click();
    await createAnnouncePromise;

    // Verificar que el anuncio creado aparece
    await expect(page.getByText(uniqueAnnouncementTitle).first()).toBeAttached({ timeout: 20000 });
  });
});
