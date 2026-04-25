export const BLISTER_ROLES = ['OWNER', 'CAREGIVER', 'OBSERVER'] as const;
export const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
export const FONT_OPTIONS = ['standard', 'dyslexic'] as const;
export const FONT_SIZE_OPTIONS = ['normal', 'large', 'xlarge'] as const;
export const STOCK_UNITS = ['pastillas', 'ml', 'gotas', 'dosis', 'sobres', 'g'] as const;
export const ICON_TYPES = ['pill', 'capsule', 'liquid', 'cream', 'inhaler', 'syringe', 'generic'] as const;
export const NOTIFICATION_TYPES = [
  'stock_low',
  'expiration_warning',
  'adherence_forced',
  'system',
] as const;
export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'critical'] as const;
export const EXPIRATION_WARNING_LEVELS = ['30d', '15d', '7d'] as const;
export const CIMA_MEDICINE_STATUS = [1, 2, 3] as const;
export const SYSTEM_SYNC_STATUS = ['idle', 'running', 'failed'] as const;
export const ADHERENCE_LOG_UNDO_WINDOW_MS = 10 * 60 * 1000;
export const NOTIFICATION_DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
