import { create } from 'zustand';

import { TOAST_DURATION_MS } from '../constants/ui.constants';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface UiState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const createToastId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  addToast: ({ message, variant, durationMs = TOAST_DURATION_MS }) => {
    const id = createToastId();
    set((state) => ({
      toasts: [...state.toasts, { id, message, variant, durationMs }],
    }));
    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));