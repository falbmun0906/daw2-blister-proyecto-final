export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Comprobaciones de actualización más frecuentes al abrir o reactivar la PWA.',
  'Tema y tamaño de pantalla restaurados al arrancar desde la app instalada.',
  'Código de commit visible en Perfil para confirmar qué versión está desplegada.',
] as const;