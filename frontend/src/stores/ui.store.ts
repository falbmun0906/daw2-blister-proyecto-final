// src/stores/ui.store.ts
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
  hasSeenOnboarding: boolean;
  notificationsSheetOpen: boolean;
  blisterSelectorOpen: boolean;
  addToast: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setHasSeenOnboarding: (value: boolean) => void;
  openNotificationsSheet: () => void;
  closeNotificationsSheet: () => void;
  toggleBlisterSelector: () => void;
  closeBlisterSelector: () => void;
}

interface PersistedUiState {
  hasSeenOnboarding: boolean;
}

const ONBOARDING_STORAGE_KEY = 'blister-has-seen-onboarding';

const createToastId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readHasSeenOnboarding = (): boolean => {
  try {
    const rawValue = globalThis.localStorage?.getItem(ONBOARDING_STORAGE_KEY);
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
  } catch {
    // Browser storage can be unavailable in private modes; UI state remains in memory.
  }

  return false;
};

const readPersistedUiState = (): PersistedUiState => {
  return {
    hasSeenOnboarding: readHasSeenOnboarding(),
  };
};

const writePersistedUiState = (state: PersistedUiState): void => {
  try {
    globalThis.localStorage?.setItem(ONBOARDING_STORAGE_KEY, state.hasSeenOnboarding ? 'true' : 'false');
  } catch {
    // Browser storage can be unavailable in private modes; UI state remains in memory.
  }
};

const setPersistedUiState = (state: PersistedUiState): PersistedUiState => {
  writePersistedUiState(state);
  return state;
};

export const useUiStore = create<UiState>()((set) => ({
  toasts: [],
  ...readPersistedUiState(),
  notificationsSheetOpen: false,
  blisterSelectorOpen: false,
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
  setHasSeenOnboarding: (value) =>
    set(() =>
      setPersistedUiState({
        hasSeenOnboarding: value,
      }),
    ),
  openNotificationsSheet: () => set({ notificationsSheetOpen: true }),
  closeNotificationsSheet: () => set({ notificationsSheetOpen: false }),
  toggleBlisterSelector: () =>
    set((state) => ({ blisterSelectorOpen: !state.blisterSelectorOpen })),
  closeBlisterSelector: () => set({ blisterSelectorOpen: false }),
}));
