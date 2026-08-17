import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Usuario } from '@chronic-covid19/shared-types';
import { apiClient } from '../lib/api';

/**
 * Store de sesión (zustand).
 *
 * Mantiene el mismo patrón/nombres que la web (`useAuthStore`,
 * `login({ user, token })`, `logout`) pero persiste el token en AsyncStorage
 * (no `persist`/localStorage) y añade `isLoading` + `restoreSession` para la
 * restauración inicial al abrir la app.
 *
 * El token del `ApiClient` vive solo en memoria, así que este store es la
 * fuente de verdad: al hacer login/restaurar hay que empujarlo con `setToken`,
 * y al cerrar sesión limpiarlo con `clearToken`.
 */

// Claves de AsyncStorage (datos NO sensibles / flags).
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const DEMO_KEY = 'is_demo'; // TEMPORAL (sesión demo del PASO 0)

interface LoginPayload {
  user: Usuario;
  token: string;
  /** TEMPORAL: marca la sesión como demo (sin backend). Se quita en el login real. */
  isDemo?: boolean;
}

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async ({ user, token, isDemo = false }) => {
    apiClient.setToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    // TEMPORAL: persistir el flag demo para que restoreSession no llame a getMe.
    if (isDemo) {
      await AsyncStorage.setItem(DEMO_KEY, '1');
    } else {
      await AsyncStorage.removeItem(DEMO_KEY);
    }
    set({ user, token, isAuthenticated: true });
  },

  logout: async () => {
    apiClient.clearToken();
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, DEMO_KEY]);
    set({ user: null, token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }

      apiClient.setToken(token);

      // TEMPORAL: si es una sesión demo, restaurar el usuario guardado sin
      // llamar al backend (permite reabrir la app sin API). Se elimina este
      // branch en el paso del login real.
      const isDemo = await AsyncStorage.getItem(DEMO_KEY);
      if (isDemo === '1') {
        const raw = await AsyncStorage.getItem(USER_KEY);
        const user = raw ? (JSON.parse(raw) as Usuario) : null;
        set({ user, token, isAuthenticated: true });
        return;
      }

      // Camino real: validar el token contra el backend.
      const me = await apiClient.getMe();
      set({ user: me as Usuario, token, isAuthenticated: true });
    } catch (error) {
      // Token inválido / backend inaccesible: limpiar sesión.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('restoreSession: no se pudo restaurar la sesión', error);
      }
      apiClient.clearToken();
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, DEMO_KEY]);
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
