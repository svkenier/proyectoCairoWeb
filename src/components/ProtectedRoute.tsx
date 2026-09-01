/**
 * ProtectedRoute — Guardián de rutas autenticadas.
 *
 * Redirige a /login si:
 *  - La sesión no está cargada aún (isLoading → muestra spinner).
 *  - El usuario no está autenticado.
 *  - El usuario no tiene el nivel de rol mínimo requerido.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LEVEL, type UserRole } from '@/types/user';
import { get } from '@/api/client';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Rol mínimo requerido para acceder a la ruta.
   * @default 'voluntario'
   */
  minRole?: UserRole;
}

export default function ProtectedRoute({
  children,
  minRole = 'voluntario',
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = async () => {
      try {
        await get('/auth/session');
      } catch {
        // El interceptor de Axios (client.ts) captura el 401, limpia la sesión y redirige
      }
    };

    // Latido cada 10 segundos
    const intervalId = setInterval(checkSession, 10000);

    // Revisión inmediata al recuperar el foco de la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Mientras se restaura la sesión desde localStorage
  if (isLoading) {
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

  // No autenticado → /login con estado de retorno
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Nivel insuficiente → /login (no revela la existencia de la ruta a roles menores)
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
