export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los avisos de citas médicas muestran ahora el nombre de la cita con un texto más claro y el recordatorio previo desaparece automáticamente cuando la hora ya ha pasado.',
  'Tras una cita, el aviso de seguimiento identifica qué cita fue para que resulte más fácil revisar si hay cambios que anotar.',
  'El diálogo de tomas forzadas se ha actualizado con el mismo modal que el resto de confirmaciones y pide la nota explicativa de forma más clara y consistente.',
] as const;
