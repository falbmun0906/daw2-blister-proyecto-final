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
  'system',
] as const;
export const notificationSeverities = ['info', 'warning', 'critical'] as const;
export const expirationWarningLevels = ['30d', '15d', '7d'] as const;
export const cimaMedicineStates = [1, 2, 3] as const;
export const systemSyncStatuses = ['idle', 'running', 'failed'] as const;
