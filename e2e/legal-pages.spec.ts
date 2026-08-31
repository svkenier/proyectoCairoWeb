import { test, expect } from '@playwright/test';

test.describe('Páginas Legales e Informativas', () => {

  // Títulos flexibles ya que algunas páginas usan el por defecto de index.html
  const legalPages = [
    { url: '/requisitos', title: /Proyecto Cairo|Requisitos/i, heading: /Requisitos/i },
    { url: '/terminos', title: /Proyecto Cairo|Términos/i, heading: /Términos/i },
    { url: '/privacidad', title: /Proyecto Cairo|Privacidad/i, heading: /Privacidad/i }
  ];

  for (const { url, title, heading } of legalPages) {
    test(`La página ${url} carga correctamente sin errores 404/500`, async ({ page }) => {
      const response = await page.goto(url);
      
      // Asegurarse de que la respuesta existe y el status es 200 (OK)
      expect(response).not.toBeNull();
      expect(response?.status()).toBe(200);

      // Verificar el título
      await expect(page).toHaveTitle(title);

      // Asegurarse de que el título principal de la página está presente
      await expect(page.locator('h1, h2').filter({ hasText: heading }).first()).toBeVisible();
      
      // Asegurarse de que el contenido principal está presente
      const mainContent = page.locator('main').or(page.locator('.MuiContainer-root').first());
      await expect(mainContent).toBeVisible();
    });
  }
});
