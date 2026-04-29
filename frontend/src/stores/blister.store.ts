import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Blister, BlisterRole } from '../types/blister.types';

interface BlisterState {
  blisters: Blister[];
  activeBlisterId: string | null;
  activeRole: BlisterRole | null;
  setBlisters: (blisters: Blister[]) => void;
  upsertBlister: (blister: Blister) => void;
  removeBlister: (blisterId: string) => void;
  setActiveBlister: (blisterId: string | null, role?: BlisterRole | null) => void;
  clearActiveBlister: () => void;
}

const initialState = {
  blisters: [] as Blister[],
  activeBlisterId: null,
  activeRole: null,
};

export const useBlisterStore = create<BlisterState>()(
  persist(
    (set) => ({
      ...initialState,
      setBlisters: (blisters) => set({ blisters }),
      upsertBlister: (blister) =>
        set((state) => {
          const exists = state.blisters.some((b) => b._id === blister._id);
          return {
            blisters: exists
              ? state.blisters.map((b) => (b._id === blister._id ? blister : b))
              : [...state.blisters, blister],
          };
        }),
      removeBlister: (blisterId) =>
        set((state) => ({
          blisters: state.blisters.filter((b) => b._id !== blisterId),
          activeBlisterId: state.activeBlisterId === blisterId ? null : state.activeBlisterId,
          activeRole: state.activeBlisterId === blisterId ? null : state.activeRole,
        })),
      setActiveBlister: (blisterId, role = null) =>
        set({
          activeBlisterId: blisterId,
          activeRole: role,
        }),
      clearActiveBlister: () => set({ activeBlisterId: null, activeRole: null }),
    }),
    {
      name: 'blister-active',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        blisters: state.blisters,
        activeBlisterId: state.activeBlisterId,
        activeRole: state.activeRole,
      }),
    },
  ),
);
