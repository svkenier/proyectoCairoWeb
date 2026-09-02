# Plan de Optimización y Seguridad - Fase 1 (2026-09-02)

## Objetivo
Optimizar el consumo de peticiones hacia Upstash Redis y GitHub API, además de mejorar la seguridad de la sesión en entornos cross-device (Desktop y Mobile).

## Cambios Implementados

### 1. Freno de Sondeo Pasivo (Polling)
- Se actualizó `ProtectedRoute.tsx` para pausar el polling de `/auth/session` cuando la aplicación pasa a segundo plano (`document.hidden === true`).
- Se implementó la escucha de eventos `visibilitychange`, `pageshow` y `pagehide` para manejar el ciclo de vida de la página, especialmente en navegadores móviles (iOS Safari, Android).
- Se aumentó el intervalo de sondeo de 3 a 20 segundos para reducir el consumo pasivo de la cuota de Upstash Redis, lo que reduce las peticiones en más de un 75%.
- Se añadió validación de sesión inmediata ante cualquier cambio de ruta interna en el panel (`location.pathname`).

### 2. Aislamiento de Redis y Uso de GitHub
- Se restringió el uso de Upstash Redis exclusivamente para gestión de sesiones, _rate limiting_ y cachés efímeras con TTL.
- Toda la configuración persistente (antes en Redis) se migró a `data/settings/general.json` en GitHub.
- Los endpoints de lectura pública de configuración y anuncios se optimizaron usando la cabecera `ETag` (`If-None-Match`), devolviendo HTTP 304 si no ha habido modificaciones, protegiendo así la cuota de GitHub (5000/hora).

### 3. Seguridad de Sesión
- Todo endpoint de mutación administrativa verifica primero la validez del token en Redis. Si es inválido, devuelve un `401 Unauthorized` antes de ejecutar cualquier lógica.
- El cliente (React Query / Axios) cuenta con un interceptor global que captura cualquier código 401 y realiza un `window.location.replace('/login')`, asegurando una expulsión inmediata e impidiendo el uso del historial del navegador para regresar a vistas protegidas.
- Modificaciones en React Query: Añadido `staleTime: 60000` en componentes críticos como el panel de administración, `Footer` y `ContactSection` para evitar múltiples lecturas redundantes.
