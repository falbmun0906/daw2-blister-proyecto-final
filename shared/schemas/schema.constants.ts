export const blisterRoles = ['OWNER', 'CAREGIVER', 'OBSERVER'] as const;
export const themeOptions = ['light', 'dark', 'system'] as const;
export const fontOptions = ['standard', 'dyslexic'] as const;
export const fontSizeOptions = ['normal', 'large', 'xlarge'] as const;
export const stockUnits = ['pastillas', 'ml', 'gotas', 'dosis', 'sobres', 'g'] as const;
export const iconTypes = ['pill', 'capsule', 'liquid', 'cream', 'inhaler', 'syringe', 'generic'] as const;
export const notificationTypes = [
  'stock_low',
  'stock_depleted',
  'expiration_warning',
  'adherence_forced',
  'cima_change',
  'system',
] as const;
export const notificationSeverities = ['info', 'warning', 'critical'] as const;
export const expirationWarningLevels = ['30d', '15d', '7d'] as const;
export const cimaMedicineStates = [1, 2, 3] as const;
export const systemSyncStatuses = ['idle', 'running', 'failed'] as const;

export const blisterAvatarKeys = [
  'briefcase',
  'home',
  'family',
  'heart',
  'pill',
  'cross',
  'leaf',
  'sun',
] as const;

export const userAvatarKeys = [
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

export const MAX_BLISTERS_PER_USER = 3;
export const DEFAULT_PERSONAL_BLISTER_NAME = 'Mi blíster';
