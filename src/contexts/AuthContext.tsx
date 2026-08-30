/**
 * Contexto global de autenticación.
 *
 * Responsabilidades:
 * - Restaurar sesión desde localStorage al cargar la app.
 * - Decodificar y validar expiración del JWT en el cliente.
 * - Exponer login(), logout() y el estado de auth a toda la app.
 * - El logout llama a POST /api/auth/logout para activar el TTL de 30 días en KV.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthState, JWTPayload, PublicUser, LoginRequest, LoginResponse } from '@/types/user';
import { getToken, setToken, clearSession, post } from '@/api/client';

// ─── Decodificador de JWT (sin verificar firma — eso es tarea del backend) ────

function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + padding)) as JWTPayload;
  } catch {
    return null;
  }
}

function isExpired(payload: JWTPayload): boolean {
  return payload.exp * 1000 < Date.now();
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const USER_KEY = 'petrescue_user';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const getInitialAuth = () => {
  if (typeof window === 'undefined') return { user: null, token: null };
  const savedToken = getToken();
  const savedUser  = localStorage.getItem(USER_KEY);

  if (savedToken && savedUser) {
    const payload = decodeJWT(savedToken);
    if (payload && !isExpired(payload)) {
      return { token: savedToken, user: JSON.parse(savedUser) as PublicUser };
    } else {
      clearSession();
    }
  }
  return { user: null, token: null };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]       = useState<PublicUser | null>(() => getInitialAuth().user);
  const [token,     setTokenState] = useState<string | null>(() => getInitialAuth().token);
  const isLoading = false;

  // Login: llama a la API, persiste token+usuario y actualiza estado
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const response = await post<LoginResponse>('/auth/login', credentials);
    setToken(response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setTokenState(response.token);
    setUser(response.user);
  }, []);

  // Logout: activa TTL de 30 días en KV, luego limpia sesión local
  const logout = useCallback(async (): Promise<void> => {
    try {
      await post<{ ok: boolean }>('/auth/logout', {});
    } catch {
      // Si falla el endpoint, igual limpiamos la sesión local
    } finally {
      clearSession();
      setTokenState(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user) && Boolean(token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Hook para consumir el contexto de autenticación. Lanza si se usa fuera del Provider. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
