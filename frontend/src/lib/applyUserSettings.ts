import type { UserSettings } from '../types/auth.types';

/**
 * Apply user settings (theme, font, fontSize) to the HTML element
 * as data attributes for CSS to consume.
 * @param settings User settings containing theme, font, and fontSize preferences
 */
export function applyUserSettings(settings: UserSettings | undefined): void {
  if (!settings) return;

  const htmlElement = document.documentElement;

  if (settings.theme) {
    htmlElement.setAttribute('data-theme', settings.theme);
  }

  if (settings.font) {
    htmlElement.setAttribute('data-font', settings.font);
  }

  if (settings.fontSize) {
    htmlElement.setAttribute('data-text-size', settings.fontSize);
  }
}
