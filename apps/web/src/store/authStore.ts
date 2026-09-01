
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@chronic-covid19/api-client';
import { RolEnum } from '@chronic-covid19/shared-types';

interface User {
  id: number;
  email: string;
  nombre: string;
  rol: RolEnum;  // ← CAMBIO: usar RolEnum en lugar de string
  debe_cambiar_password?: boolean;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (authData: { user: User; token: string }) => void;
  logout: () => void;
  /**
   * Aplica un cambio parcial sobre el usuario en sesión (el `persist` de zustand
   * guarda el resultado). Se usa, por ejemplo, para apagar el aviso de contraseña
   * temporal apenas el médico la cambia, sin obligarlo a volver a iniciar sesión.
   */
  updateUser: (parcial: Partial<User>) => void;
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
      updateUser: (parcial) =>
        set((state) => (state.user ? { user: { ...state.user, ...parcial } } : {})),
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