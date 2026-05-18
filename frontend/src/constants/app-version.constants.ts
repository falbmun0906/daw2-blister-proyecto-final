export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'La app avisa y comprueba mejor las actualizaciones disponibles de la PWA, evitando listeners duplicados.',
  'Los modales, selectores y paneles de notificaciones son más accesibles con teclado y lectores de pantalla.',
  'Las listas de calendario, tratamientos, botiquín y resultados CIMA usan claves y ordenaciones más estables.',
  'Se han pulido pequeños detalles de rendimiento en búsquedas, fechas, invitaciones y notificaciones.',
] as const;
