export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los modales se adaptan mejor al contenido: crecen lo necesario y mantienen un límite máximo del 80% de la pantalla.',
  'La eliminación de cuenta aparece ahora como una opción más dentro de Editar perfil, con una confirmación más clara antes de continuar.',
  'Los avisos de actualización evitan duplicados cuando la aplicación prepara y muestra una nueva versión.',
] as const;
