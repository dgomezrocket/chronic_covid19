import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Usuario } from '@chronic-covid19/shared-types';
import { apiClient } from '@chronic-covid19/api-client';

interface AuthStore {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (authData: { user: Usuario; token: string }) => void;
  setAuth: (user: Usuario, token: string) => void;  // NUEVO: alias de login
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: ({ user, token }) => {
        apiClient.setToken(token);
        set({ user, token, isAuthenticated: true });
      },
      setAuth: (user, token) => {  // NUEVO: implementación
        apiClient.setToken(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        apiClient.clearToken();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);