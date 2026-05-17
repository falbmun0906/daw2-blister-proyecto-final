export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Actualización controlada de la PWA instalada en iOS y Android.',
  'Aviso cuando hay una nueva versión disponible antes de recargar.',
  'Mejor conservación del modo sin conexión durante cambios de versión.',
] as const;