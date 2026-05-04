export const BLISTER_ROLES = ['OWNER', 'CAREGIVER', 'OBSERVER'] as const;
export const THEME_OPTIONS = ['light', 'dark', 'system'] as const;
export const FONT_OPTIONS = ['standard', 'dyslexic'] as const;
export const FONT_SIZE_OPTIONS = ['normal', 'large', 'xlarge'] as const;
export const STOCK_UNITS = ['pastillas', 'ml', 'gotas', 'dosis', 'sobres', 'g'] as const;
export const ICON_TYPES = ['pill', 'capsule', 'liquid', 'cream', 'inhaler', 'syringe', 'generic'] as const;
export const NOTIFICATION_TYPES = [
  'stock_low',
  'stock_depleted',
  'expiration_warning',
  'adherence_forced',
  'cima_change',
  'system',
] as const;
export const NOTIFICATION_SEVERITIES = ['info', 'warning', 'critical'] as const;
export const EXPIRATION_WARNING_LEVELS = ['30d', '15d', '7d'] as const;
export const CIMA_MEDICINE_STATUS = [1, 2, 3] as const;
export const SYSTEM_SYNC_STATUS = ['idle', 'running', 'failed'] as const;
export const CIMA_CHANGE_TYPES = ['new', 'removed', 'updated'] as const;
export const ADHERENCE_LOG_UNDO_WINDOW_MS = 3 * 60 * 1000;
export const NOTIFICATION_DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CIMA_SYNC_META_KEY = 'cimaSync' as const;
export const DEFAULT_CIMA_SYNC_LOOKBACK_DAYS = 30;

export const DEFAULT_PERSONAL_BLISTER_NAME = 'Mi blíster';
export const MAX_BLISTERS_PER_USER = 3;
export const BLISTER_RESTORE_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

/**
 * Catalogo de avatares disponibles para Blísteres. Separado del de usuarios
 * para que el frontend pueda mapear ilustraciones distintas (botiquines vs.
 * personas) sin acoplar ambos sets.
 */
export const BLISTER_AVATAR_KEYS = [
  'briefcase',
  'home',
  'family',
  'heart',
  'pill',
  'cross',
  'leaf',
  'sun',
] as const;

/**
 * Catalogo de avatares disponibles para Usuarios.
 */
export const USER_AVATAR_KEYS = [
  'avatar-1',
  'avatar-2',
  'avatar-3',
  'avatar-4',
  'avatar-5',
  'avatar-6',
  'avatar-7',
  'avatar-8',
  'avatar-9',
  'avatar-10',
  'avatar-11',
] as const;
