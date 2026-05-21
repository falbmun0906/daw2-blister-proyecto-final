import { describe, expect, it } from 'vitest';

import { LAST_SEEN_APP_VERSION_KEY } from '../constants/app-version.constants';
import {
  markCurrentAppVersionSeen,
  readLastSeenAppVersion,
  shouldShowReleaseNotes,
} from './app-version-storage';

describe('app-version-storage', () => {
  it('shows release notes only when a previous version exists and changed', () => {
    expect(shouldShowReleaseNotes(null, '1.0.0')).toBe(false);
    expect(shouldShowReleaseNotes('1.0.0', '1.0.0')).toBe(false);
    expect(shouldShowReleaseNotes('1.0.0', '1.1.0')).toBe(true);
  });

  it('stores the current app version in localStorage', () => {
    window.localStorage.removeItem(LAST_SEEN_APP_VERSION_KEY);

    markCurrentAppVersionSeen(window.localStorage);

    expect(readLastSeenAppVersion(window.localStorage)).toBeTruthy();
  });
});