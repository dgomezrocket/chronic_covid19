
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum } from '@chronic-covid19/shared-types';

interface User {
  id: number;
  email: string;
  nombre: string;
  rol: RolEnum;  // ← CAMBIO: usar RolEnum en lugar de string
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (authData: { user: User; token: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (authData) => {
        console.log('🔐 Login: Configurando usuario y token');
        apiClient.setToken(authData.token);
        set({
          user: authData.user,
          token: authData.token,
          isAuthenticated: true,
        });
      },
      logout: () => {
        console.log('🔓 Logout: Limpiando token del apiClient');
        apiClient.clearToken();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        console.log('💧 Rehidratando estado de autenticación...');
        if (state?.token) {
          console.log('✅ Token encontrado, configurando en apiClient');
          apiClient.setToken(state.token);
        } else {
          console.log('⚠️ No hay token para rehidratar');
        }
      },
    }
  )
);