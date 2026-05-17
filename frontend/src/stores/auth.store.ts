import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AuthSession, User } from '../types/auth.types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthSession) => void;
  updateUser: (user: Partial<User>) => void;
  clearSession: () => void;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
};

export const AUTH_STORAGE_KEY = 'blister-auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),
      updateUser: (user) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...user } : state.user,
        })),
      clearSession: () => set({ ...initialState }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
