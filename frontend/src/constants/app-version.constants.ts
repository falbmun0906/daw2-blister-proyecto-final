export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Blíster avisa mejor cuando hay una nueva versión lista para usar.',
  'La app instalada conserva mejor el modo oscuro y el tamaño correcto de pantalla en móvil.',
  'Invitar a otras personas a un blíster es más claro y permite compartir el mensaje desde otras apps.',
] as const;