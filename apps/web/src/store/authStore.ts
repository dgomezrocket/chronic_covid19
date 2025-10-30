import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, Usuario } from '@chronic-covid19/shared-types';

interface AuthStore extends AuthState {
  setAuth: (user: Usuario, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);