import { AUTH_STORAGE_KEY } from '../stores/auth.store';
import type { UserSettings } from '../types/auth.types';
import { applyUserSettings } from './applyUserSettings';

interface PersistedAuthState {
  state?: {
    user?: {
      settings?: UserSettings;
    };
  };
}

const readStoredUserSettings = (): UserSettings | undefined => {
  try {
    const rawValue = window.sessionStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawValue) return undefined;

    const persistedState = JSON.parse(rawValue) as PersistedAuthState;
    return persistedState.state?.user?.settings;
  } catch {
    return undefined;
  }
};

export const applyStoredUserSettings = (): void => {
  applyUserSettings(readStoredUserSettings());
};