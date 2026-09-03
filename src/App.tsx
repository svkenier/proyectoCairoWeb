/**
 * App.tsx — Enrutamiento principal de petRescue.
 *
 * Rutas públicas: /, /mascotas, /mascotas/:id, /requisitos, /terminos, /privacidad, /login
 * Rutas protegidas: /admin (minRole: voluntario)
 *
 * AuthProvider envuelve toda la app para que useAuth() esté disponible
 * en Navbar, ProtectedRoute y cualquier página que lo necesite.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';

// ─── Lazy-loading de páginas (code splitting automático por Vite) ──────────────
import Home from '@/pages/Home';
const Catalog      = lazy(() => import('@/pages/Catalog'));
const PetDetail    = lazy(() => import('@/pages/PetDetail'));
const Requirements = lazy(() => import('@/pages/Requirements'));
const Terms        = lazy(() => import('@/pages/Terms'));
const Privacy      = lazy(() => import('@/pages/Privacy'));
const Login        = lazy(() => import('@/pages/Login'));
const Admin        = lazy(() => import('@/pages/Admin'));
const NotFound     = lazy(() => import('@/pages/NotFound'));

// ─── Fallback de carga ───────────────────────────────────────────────────────
function PageLoader() {
  return (
    <Box
      sx={{
        minHeight:      '100vh',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        bgcolor:        'background.default',
      }}
    >
      <CircularProgress color="primary" />
    </Box>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/"           element={<Home />} />
            <Route path="/mascotas"   element={<Catalog />} />
            <Route path="/mascotas/:id" element={<PetDetail />} />
            <Route path="/requisitos" element={<Requirements />} />
            <Route path="/terminos"   element={<Terms />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/login"      element={<Login />} />

            {/* Ruta protegida — acceso mínimo: voluntario */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute minRole="voluntario">
                  <Admin />
                </ProtectedRoute>
              }
            />

            {/* Catch-all → 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Box>
      </Suspense>
    </AuthProvider>
  );
}
