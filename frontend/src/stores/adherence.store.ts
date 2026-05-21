import { create } from 'zustand';

import type { AdherenceLog } from '../types/adherence.types';

interface AdherenceState {
  logs: AdherenceLog[];
  setLogs: (logs: AdherenceLog[]) => void;
  addLog: (log: AdherenceLog) => void;
  removeLog: (logId: string) => void;
  clear: () => void;
}

export const useAdherenceStore = create<AdherenceState>((set) => ({
  logs: [],
  setLogs: (logs) => set({ logs }),
  addLog: (log) =>
    set((state) => ({
      logs: [log, ...state.logs.filter((l) => l.id !== log.id)],
    })),
  removeLog: (logId) =>
    set((state) => ({
      logs: state.logs.filter((l) => l.id !== logId),
    })),
  clear: () => set({ logs: [] }),
}));
