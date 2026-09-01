import { test, expect } from '@playwright/test';

test.describe('Páginas Públicas y Navegación', () => {

  test.beforeEach(async ({ page }) => {
    // Mock settings and pets to avoid ECONNREFUSED when vercel dev is not running
    await page.route('**/api/settings', async route => {
      await route.fulfill({ status: 200, json: {} });
    });
    
    await page.route('**/api/public/pets', async route => {
      await route.fulfill({ status: 200, json: { mascotas: [] } });
    });
  });

  test('La página de Inicio (/) carga sin errores y muestra componentes clave', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    
    // Verificar que no hay errores HTTP ni errores en consola no controlados
    expect(errors.length).toBe(0);

    // Verificar el título y el Hero
    await expect(page).toHaveTitle(/Proyecto Cairo|Inicio/i);
    await expect(page.locator('h1')).toHaveText(/Dale un hogar a quien más lo necesita/i);

    // Verificar que los botones directos cargan
    const viewPetsBtn = page.getByRole('link', { name: /ver mascotas/i });
    await expect(viewPetsBtn).toBeVisible({ timeout: 10000 });

    // Comprobar que las imágenes cargan correctamente (código HTTP 200 implícito al no estar rotas)
    // Verificaremos una de las imágenes principales si existen
    const images = await page.locator('img').all();
    for (const img of images) {
      const isVisible = await img.isVisible();
      if (isVisible) {
        // Verificar usando evaluación de JS que el naturalWidth > 0
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });

  test('El catálogo de Mascotas (/mascotas) muestra listado o Empty State', async ({ page }) => {
    await page.goto('/mascotas');
    await expect(page).toHaveTitle(/Proyecto Cairo|Catálogo/i);

    // Esperar a que la carga termine (esperar que desaparezca el Skeleton o aparezca texto)
    // Buscamos algo que confirme que la página terminó de cargar
    const petButton = page.getByRole('button', { name: /Conocer más/i }).first();
    const emptyState = page.getByText(/No hay mascotas registradas/i).first();

    await expect(petButton.or(emptyState)).toBeAttached({ timeout: 10000 });
  });

});
