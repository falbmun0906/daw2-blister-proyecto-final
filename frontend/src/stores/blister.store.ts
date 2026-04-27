import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Blister, BlisterRole } from '../types/blister.types';

interface BlisterState {
  blisters: Blister[];
  activeBlisterId: string | null;
  activeRole: BlisterRole | null;
  setBlisters: (blisters: Blister[]) => void;
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