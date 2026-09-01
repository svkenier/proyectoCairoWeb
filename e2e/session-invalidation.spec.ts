import { test, expect, request as pwRequest } from '@playwright/test';
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
  const payload = {
    sub: username,
    role,
    tokenVersion,
    exp: Math.floor(Date.now() / 1000) + 8 * 3600
  };
  
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${signatureInput}.${signature}`;
}

test.describe('Invalidación de Sesiones Globales y Seguridad', () => {
  const testUser = `testuser_${Date.now()}`;
  const testPassword = 'TestPassword123!';

  // Utilidad para limpiar el usuario de prueba
  async function cleanupUser(requestCtx) {
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    await requestCtx.delete('/api/users/delete', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { target_username: testUser }
    });
  }

  test.beforeEach(async ({ request }) => {
    await cleanupUser(request);
    
    // Crear usuario de prueba como Superadmin
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    const res = await request.post('/api/users/create', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username: testUser,
        password: testPassword,
        role: 'voluntario'
      }
    });
    if (!res.ok()) {
      console.log('Error creating user:', await res.text());
    }
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await cleanupUser(request);
  });

  test('Cierre de Sesión Forzado multi-contexto (Superadmin cierra sesión de usuario regular)', async ({ browser }) => {
    // 1. Crear contexto del usuario regular (simulando un navegador diferente)
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    // Inyectar sesión normal con el usuario
    const userToken = generateToken(testUser, 'voluntario', 1);
    await userPage.goto('/');
    await userPage.evaluate(({ token, user }) => {
      localStorage.setItem('petrescue_token', token);
      localStorage.setItem('petrescue_user', JSON.stringify(user));
    }, { token: userToken, user: { username: testUser, role: 'voluntario' } });
    
    // Debe entrar al admin
    await userPage.goto('/admin');
    await expect(userPage.getByRole('heading', { name: /Panel de Administración/i })).toBeVisible();
    
    // 2. Crear contexto del Superadmin
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // Inyectar sesión de superadmin
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    const adminUserData = { username: SUPERADMIN, role: 'superadmin' };
    await adminPage.goto('/');
    await adminPage.evaluate(({ token, user }) => {
      localStorage.setItem('petrescue_token', token);
      localStorage.setItem('petrescue_user', JSON.stringify(user));
    }, { token: adminToken, user: adminUserData });
    
    // Ir al panel de usuarios
    await adminPage.goto('/admin');
    const listResponsePromise1 = adminPage.waitForResponse(response => response.url().includes('/api/users/list') && (response.status() === 200 || response.status() === 304));
    await adminPage.getByRole('tab', { name: 'Usuarios' }).click();
    await listResponsePromise1;
    
    // Buscar al usuario de prueba y forzar logout
    // Buscamos la fila del usuario y usamos data-testid
    await adminPage.locator('table').getByTestId(`force-logout-${testUser}`).click();
    
    // Confirmar en el modal
    const dialog = adminPage.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const responsePromise = adminPage.waitForResponse(response => response.url().includes('/api/users/force-logout') && response.status() === 200);
    await dialog.getByRole('button', { name: 'Forzar Cierre' }).click();
    await responsePromise;
    await expect(adminPage.getByText('Sesiones invalidadas con éxito.')).toBeVisible({ timeout: 10000 });
    
    // 3. Volver a la página del usuario y recargar, luego intentar una acción protegida
    await userPage.reload();
    await userPage.getByRole('button', { name: /Nueva mascota/i }).click();
    // Llenar datos mínimos para pasar validación frontend y enviar al backend
    await userPage.getByLabel(/Nombre \*/i).fill('Mascota Test Inval');
    await userPage.getByLabel('Especie').click();
    await userPage.getByRole('option', { name: /Perro/i }).click();
    await userPage.getByLabel('Sexo').click();
    await userPage.getByRole('option', { name: /Macho/i }).click();
    await userPage.getByRole('button', { name: /Crear mascota/i }).click();
    
    // Como su tokenVersion en la cookie/localStorage ya no coincide con Redis, la API devolverá 401 y será redirigido
    await expect(userPage).toHaveURL(/.*\/login/, { timeout: 15000 });
    
    await userContext.close();
    await adminContext.close();
  });

  test('Invalidación por Cambio de Contraseña', async ({ browser }) => {
    // 1. Contexto del usuario
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    // Inyectar sesión del usuario usando token generado (simulando que inició sesión hace rato)
    // El tokenVersion del testUser recién creado será 1
    const userToken = generateToken(testUser, 'voluntario', 1);
    const userData = { username: testUser, role: 'voluntario' };
    await userPage.goto('/');
    await userPage.evaluate(({ token, user }) => {
      localStorage.setItem('petrescue_token', token);
      localStorage.setItem('petrescue_user', JSON.stringify(user));
    }, { token: userToken, user: userData });
    
    await userPage.goto('/admin');
    await expect(userPage.getByRole('heading', { name: /Panel de Administración/i })).toBeVisible();
    
    // 2. Contexto del Superadmin (simulando reset de contraseña)
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const adminToken = generateToken(SUPERADMIN, 'superadmin');
    await adminPage.goto('/');
    await adminPage.evaluate(({ token, user }) => {
      localStorage.setItem('petrescue_token', token);
      localStorage.setItem('petrescue_user', JSON.stringify(user));
    }, { token: adminToken, user: { username: SUPERADMIN, role: 'superadmin' } });
    
    await adminPage.goto('/admin');
    const listResponsePromise2 = adminPage.waitForResponse(response => response.url().includes('/api/users/list') && (response.status() === 200 || response.status() === 304));
    await adminPage.getByRole('tab', { name: 'Usuarios' }).click();
    await listResponsePromise2;
    await adminPage.locator('table').getByTestId(`reset-${testUser}`).click();
    
    const dialog = adminPage.getByRole('dialog');
    await dialog.getByLabel(/Nueva Contraseña/i).fill('NuevoPass123!');
    const resetResponsePromise = adminPage.waitForResponse(response => response.url().includes('/api/users/reset-password') && response.status() === 200);
    await dialog.getByRole('button', { name: 'Resetear' }).click();
    await resetResponsePromise;
    await expect(adminPage.getByText(/exitosamente/i)).toBeVisible({ timeout: 10000 });
    
    // 3. Verificar que el usuario regular fue invalidado intentando una acción protegida
    await userPage.reload();
    await userPage.getByRole('button', { name: /Nueva mascota/i }).click();
    await userPage.getByLabel(/Nombre \*/i).fill('Mascota Test Inval');
    await userPage.getByLabel('Especie').click();
    await userPage.getByRole('option', { name: /Perro/i }).click();
    await userPage.getByLabel('Sexo').click();
    await userPage.getByRole('option', { name: /Macho/i }).click();
    await userPage.getByRole('button', { name: /Crear mascota/i }).click();
    await expect(userPage).toHaveURL(/.*\/login/, { timeout: 15000 });

    await userContext.close();
    await adminContext.close();
  });

  test('Seguridad en Endpoint /api/users/force-logout', async ({ request }) => {
    // 1. Un voluntario intenta llamar al endpoint (403 Forbidden o 401)
    const userToken = generateToken(testUser, 'voluntario', 1);
    const resForbidden = await request.post('/api/users/force-logout', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { target_username: SUPERADMIN }
    });
    expect(resForbidden.status()).toBe(403);
    
    // 2. Superadmin intenta borrarse a sí mismo
    const adminToken = generateToken(SUPERADMIN, 'superadmin', 1);
    const resSelf = await request.post('/api/users/force-logout', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { target_username: SUPERADMIN }
    });
    expect(resSelf.status()).toBe(400); // Bad Request
    const jsonSelf = await resSelf.json();
    expect(jsonSelf.error).toContain('propia cuenta principal');
  });

  test('Test de Integración de Preservación de TTLs en Upstash Redis', async ({ request }) => {
    const adminToken = generateToken(SUPERADMIN, 'superadmin', 1);
    
    // 1. Activar el TTL manualmente enviando logout request para el usuario
    const userToken = generateToken(testUser, 'voluntario', 1);
    await request.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    // 2. Verificar el TTL directamente en KV a través del REST API de Upstash
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const resTtl1 = await request.get(`${upstashUrl}/ttl/user:${testUser}`, {
      headers: { Authorization: `Bearer ${upstashToken}` }
    });
    const ttl1Data = await resTtl1.json();
    const ttl1 = ttl1Data.result; // El TTL en segundos
    
    expect(ttl1).toBeGreaterThan(0); // Debe tener un TTL activo
    
    // 3. Simular un force-logout que actualizará el tokenVersion
    const resForce = await request.post('/api/users/force-logout', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { target_username: testUser }
    });
    expect(resForce.ok()).toBeTruthy();
    
    // 4. Verificar que el TTL sigue siendo aproximadamente el mismo
    const resTtl2 = await request.get(`${upstashUrl}/ttl/user:${testUser}`, {
      headers: { Authorization: `Bearer ${upstashToken}` }
    });
    const ttl2Data = await resTtl2.json();
    const ttl2 = ttl2Data.result;
    
    // Debe preservarlo y solo restarle el tiempo ínfimo que tomó la ejecución (usualmente 0 o 1 segundo de diferencia)
    expect(ttl2).toBeGreaterThan(0);
    expect(Math.abs(ttl1 - ttl2)).toBeLessThan(5); // Margen de 5 segundos
  });

});
