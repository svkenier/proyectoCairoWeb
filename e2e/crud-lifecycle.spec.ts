import { test, expect } from '@playwright/test';

test.describe('Ciclo CRUD en Panel Administrativo (Mocked)', () => {

  test.beforeEach(async ({ page }) => {
    // Mock login endpoint
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        json: { token: 'fake-jwt-token', user: { username: 'admin', role: 'superadmin' } }
      });
    });

    // Mock initial data fetch for pets and announcements
    await page.route('**/api/public/pets', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { mascotas: [] } });
      }
    });

    await page.route('**/api/announcements', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { anuncios: [] } });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { ok: true } });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { ok: true } });
      }
    });

    await page.route('**/api/pets', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { ok: true } });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, json: { ok: true } });
      }
    });
  });

  test('Permite crear y luego simular el listado de una mascota y anuncio', async ({ page }) => {
    // 1. Iniciar sesión
    await page.goto('/login');
    await page.getByLabel(/Usuario/i).fill('admin');
    await page.getByLabel(/Contraseña/i).fill('password123');
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Debe llevarnos al panel admin
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.getByRole('heading', { name: /Panel de Administración/i })).toBeVisible();

    // 2. Verificar Empty State en Mascotas
    // Hay dos elementos (desktop/mobile), verificamos que al menos uno esté en el DOM (Playwright maneja la visibilidad en strict mode usando assertions)
    await expect(page.getByText(/No hay mascotas registradas/i).first()).toBeAttached();

    // 3. Crear una Mascota (MOCK)
    await page.getByRole('button', { name: /Nueva mascota/i }).click();
    await page.getByLabel(/Nombre \*/i).fill('Firulais Test');
    
    // Interceptar la siguiente llamada a GET /pets para que devuelva la mascota creada
    await page.route('**/api/public/pets', async route => {
      await route.fulfill({
        status: 200,
        json: {
          mascotas: [{
            id: 'firulais-test',
            nombre: 'Firulais Test',
            especie: 'perro',
            estado: 'en_adopcion',
            destacado: false,
            created_at: new Date().toISOString()
          }]
        }
      });
    });

    await page.getByRole('button', { name: /Crear mascota/i }).click();

    // Verificar que aparece en la tabla (o tarjeta)
    await expect(page.getByText('Firulais Test').first()).toBeAttached();

    // 4. Cambiar a Pestaña Anuncios
    await page.getByRole('tab', { name: /Eventos y Anuncios/i }).click();
    await expect(page.getByText(/No hay anuncios/i).first()).toBeAttached();

    // 5. Crear Anuncio (MOCK)
    await page.getByRole('button', { name: /Nuevo Anuncio/i }).click();
    await page.getByLabel(/Título/i).fill('Jornada de Adopción Test');
    await page.getByLabel(/Descripción/i).fill('Ven a adoptar a tu nuevo mejor amigo.');

    await page.route('**/api/announcements', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            announcements: [{
              id: 'anuncio-test',
              title: 'Jornada de Adopción Test',
              description: 'Contenido de prueba',
              type: 'evento',
              is_active: true,
              created_at: new Date().toISOString()
            }]
          }
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, json: { ok: true } });
      }
    });

    await page.getByRole('button', { name: /Crear anuncio/i }).click();
    
    // Verificar que el anuncio creado aparece
    await expect(page.getByText('Jornada de Adopción Test').first()).toBeAttached();
  });
});
