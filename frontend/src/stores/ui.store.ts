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
  canReplayOnboarding: boolean;
  notificationsSheetOpen: boolean;
  blisterSelectorOpen: boolean;
  addToast: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setHasSeenOnboarding: (value: boolean) => void;
  enableOnboardingReplay: () => void;
  disableOnboardingReplay: () => void;
  openNotificationsSheet: () => void;
  closeNotificationsSheet: () => void;
  toggleBlisterSelector: () => void;
  closeBlisterSelector: () => void;
}

interface PersistedUiState {
  hasSeenOnboarding: boolean;
  canReplayOnboarding: boolean;
}

const UI_SESSION_KEY = 'blister-ui';

const createToastId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const readPersistedUiState = (): PersistedUiState => {
  try {
    const rawValue = globalThis.sessionStorage?.getItem(UI_SESSION_KEY);

    if (!rawValue) {
      return {
        hasSeenOnboarding: false,
        canReplayOnboarding: false,
      };
    }

    const parsed = JSON.parse(rawValue) as Partial<PersistedUiState>;

    return {
      hasSeenOnboarding: parsed.hasSeenOnboarding === true,
      canReplayOnboarding: parsed.canReplayOnboarding === true,
    };
  } catch {
    return {
      hasSeenOnboarding: false,
      canReplayOnboarding: false,
    };
  }
};

const writePersistedUiState = (state: PersistedUiState): void => {
  try {
    globalThis.sessionStorage?.setItem(UI_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Browser storage can be unavailable in private modes; UI state remains in memory.
  }
};

const setPersistedUiState = (state: PersistedUiState): PersistedUiState => {
  writePersistedUiState(state);
  return state;
};

export const useUiStore = create<UiState>()((set, get) => ({
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
        canReplayOnboarding: get().canReplayOnboarding,
      }),
    ),
  enableOnboardingReplay: () =>
    set(() =>
      setPersistedUiState({
        hasSeenOnboarding: get().hasSeenOnboarding,
        canReplayOnboarding: true,
      }),
    ),
  disableOnboardingReplay: () =>
    set(() =>
      setPersistedUiState({
        hasSeenOnboarding: get().hasSeenOnboarding,
        canReplayOnboarding: false,
      }),
    ),
  openNotificationsSheet: () => set({ notificationsSheetOpen: true }),
  closeNotificationsSheet: () => set({ notificationsSheetOpen: false }),
  toggleBlisterSelector: () =>
    set((state) => ({ blisterSelectorOpen: !state.blisterSelectorOpen })),
  closeBlisterSelector: () => set({ blisterSelectorOpen: false }),
}));
