export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Las cuentas nuevas deben confirmar el correo antes de usar la app, con una pantalla de registro más clara.',
  'Las eliminaciones usan confirmaciones propias de Blíster para evitar acciones accidentales.',
  'Los tratamientos y medicamentos muestran avisos más precisos, con alertas CIMA mejor explicadas.',
] as const;