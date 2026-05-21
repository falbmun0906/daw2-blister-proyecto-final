import {
  APP_VERSION,
  LAST_SEEN_APP_VERSION_KEY,
} from '../constants/app-version.constants';

const getLocalStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readLastSeenAppVersion = (storage = getLocalStorage()): string | null => {
  try {
    return storage?.getItem(LAST_SEEN_APP_VERSION_KEY) ?? null;
  } catch {
    return null;
  }
};

export const markCurrentAppVersionSeen = (storage = getLocalStorage()): void => {
  try {
    storage?.setItem(LAST_SEEN_APP_VERSION_KEY, APP_VERSION);
  } catch {
    // localStorage can be unavailable in private browsing; the app still works.
  }
};

export const shouldShowReleaseNotes = (lastSeenVersion: string | null, currentVersion = APP_VERSION): boolean =>
  Boolean(lastSeenVersion && lastSeenVersion !== currentVersion);