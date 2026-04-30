export const blisterRoles = ['OWNER', 'CAREGIVER', 'OBSERVER'] as const;
export const themeOptions = ['light', 'dark', 'system'] as const;
export const fontOptions = ['standard', 'dyslexic'] as const;
export const fontSizeOptions = ['normal', 'large', 'xlarge'] as const;
export const stockUnits = ['pastillas', 'ml', 'gotas', 'dosis', 'sobres', 'g'] as const;
export const iconTypes = ['pill', 'capsule', 'liquid', 'cream', 'inhaler', 'syringe', 'generic'] as const;
export const notificationTypes = [
  'stock_low',
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
  'avatar-01',
  'avatar-02',
  'avatar-03',
  'avatar-04',
  'avatar-05',
  'avatar-06',
  'avatar-07',
  'avatar-08',
] as const;

export const MAX_BLISTERS_PER_USER = 3;
export const DEFAULT_PERSONAL_BLISTER_NAME = 'Mi blíster';
