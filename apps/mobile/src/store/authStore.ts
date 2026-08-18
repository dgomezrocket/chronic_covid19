import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { RolEnum } from '@chronic-covid19/shared-types';
import type { Usuario } from '@chronic-covid19/shared-types';
import { apiClient } from '../lib/api';

/**
 * Store de sesión (zustand).
 *
 * El token es un dato SENSIBLE → se persiste en SecureStore (no AsyncStorage).
 * El token del `ApiClient` vive solo en memoria, así que este store lo empuja
 * con `setToken` al iniciar/restaurar y lo limpia con `clearToken` al cerrar.
 * El usuario NO se persiste: se reobtiene con `getMe` en cada arranque, lo que
 * además valida el token contra el backend.
 */

const TOKEN_KEY = 'auth_token';

interface AuthState {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Persiste una sesión ya validada (paciente) en SecureStore + ApiClient. */
  setSession: (payload: { user: Usuario; token: string }) => Promise<void>;
  /** Cierre de sesión definitivo: limpia ApiClient, SecureStore y estado. */
  logout: () => Promise<void>;
  /** Al abrir la app: restaura el token, valida con getMe y verifica el rol. */
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: async ({ user, token }) => {
    apiClient.setToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    apiClient.clearToken();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ user: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      apiClient.setToken(token);

      // Validar el token contra el backend y verificar que sea un paciente.
      const me = await apiClient.getMe();
      if (!me || me.rol !== RolEnum.PACIENTE) {
        apiClient.clearToken();
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        set({ user: null, isAuthenticated: false });
        return;
      }

      const user: Usuario = {
        id: me.id,
        email: me.email,
        nombre: me.nombre,
        rol: RolEnum.PACIENTE,
        debe_cambiar_password: Boolean(me.debe_cambiar_password),
      };
      set({ user, isAuthenticated: true });
    } catch (error) {
      // Token inválido / backend inaccesible: limpiar sesión.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('restoreSession: no se pudo restaurar la sesión', error);
      }
      apiClient.clearToken();
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } catch {
        // ignorar errores al limpiar
      }
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
