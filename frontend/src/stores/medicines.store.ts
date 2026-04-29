import { create } from 'zustand';

import type { Medicine } from '../types/medicine.types';

interface MedicinesState {
  medicines: Medicine[];
  setMedicines: (medicines: Medicine[]) => void;
  upsertMedicine: (medicine: Medicine) => void;
  removeMedicine: (medicineId: string) => void;
  clear: () => void;
}

export const useMedicinesStore = create<MedicinesState>((set) => ({
  medicines: [],
  setMedicines: (medicines) => set({ medicines }),
  upsertMedicine: (medicine) =>
    set((state) => {
      const exists = state.medicines.some((m) => m._id === medicine._id);
      return {
        medicines: exists
          ? state.medicines.map((m) => (m._id === medicine._id ? medicine : m))
          : [...state.medicines, medicine],
      };
    }),
  removeMedicine: (medicineId) =>
    set((state) => ({
      medicines: state.medicines.filter((m) => m._id !== medicineId),
    })),
  clear: () => set({ medicines: [] }),
}));
