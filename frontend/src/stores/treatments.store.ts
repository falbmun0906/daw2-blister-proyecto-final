import { create } from 'zustand';

import type { Treatment } from '../types/treatment.types';

interface TreatmentsState {
  treatments: Treatment[];
  setTreatments: (treatments: Treatment[]) => void;
  upsertTreatment: (treatment: Treatment) => void;
  removeTreatment: (treatmentId: string) => void;
  clear: () => void;
}

export const useTreatmentsStore = create<TreatmentsState>((set) => ({
  treatments: [],
  setTreatments: (treatments) => set({ treatments }),
  upsertTreatment: (treatment) =>
    set((state) => {
      const exists = state.treatments.some((t) => t.id === treatment.id);
      return {
        treatments: exists
          ? state.treatments.map((t) => (t.id === treatment.id ? treatment : t))
          : [...state.treatments, treatment],
      };
    }),
  removeTreatment: (treatmentId) =>
    set((state) => ({
      treatments: state.treatments.filter((t) => t.id !== treatmentId),
    })),
  clear: () => set({ treatments: [] }),
}));
