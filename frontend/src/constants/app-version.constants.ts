export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'La eliminación de cuenta tiene ahora su propia pantalla dentro de Editar perfil, con un aviso previo antes de abrir la confirmación final.',
  'Cambiar contraseña comparte ya la misma profundidad de navegación que la información personal dentro de Editar perfil.',
  'Las actualizaciones pendientes se anuncian con un único aviso mientras la app prepara la nueva versión.',
] as const;
