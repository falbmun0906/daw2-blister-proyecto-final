import type { UserSettings } from '../types/auth.types';

let removeSystemThemeListener: (() => void) | null = null;

function resolveSystemTheme(media: MediaQueryList | null): 'light' | 'dark' {
  return media?.matches ? 'dark' : 'light';
}

function applyTheme(theme: UserSettings['theme'], htmlElement: HTMLElement): void {
  removeSystemThemeListener?.();
  removeSystemThemeListener = null;

  if (theme === 'system') {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
    const syncSystemTheme = () => {
      htmlElement.setAttribute('data-theme', resolveSystemTheme(media));
    };

    htmlElement.setAttribute('data-theme-choice', 'system');
    syncSystemTheme();

    if (media) {
      media.addEventListener('change', syncSystemTheme);
      removeSystemThemeListener = () => media.removeEventListener('change', syncSystemTheme);
    }
    return;
  }

  htmlElement.setAttribute('data-theme-choice', theme);
  htmlElement.setAttribute('data-theme', theme);
}

/**
 * Apply user settings (theme, font, fontSize) to the HTML element
 * as data attributes for CSS to consume.
 * @param settings User settings containing theme, font, and fontSize preferences
 */
export function applyUserSettings(settings: UserSettings | undefined): void {
  if (!settings) return;

  const htmlElement = document.documentElement;

  if (settings.theme) {
    applyTheme(settings.theme, htmlElement);
  }

  if (settings.font) {
    htmlElement.setAttribute('data-font', settings.font);
  }

  if (settings.fontSize) {
    htmlElement.setAttribute('data-text-size', settings.fontSize);
  }
}
