export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Las preferencias de notificaciones se actualizan al momento: al activar las push se solicita el permiso y se registra el dispositivo sin usar un botón de guardado.',
  'Los recordatorios de tomas y citas son más resistentes a pausas del servidor y se envían con prioridad alta para mejorar la entrega en móvil.',
  'La sesión aguanta mejor el uso diario de la PWA: cada dispositivo conserva su propia renovación y el plazo por defecto pasa a 30 días.',
  'El inicio de sesión incorpora el acceso directo para recordar la contraseña y se ha reforzado el cierre de sesión del dispositivo actual.',
] as const;
