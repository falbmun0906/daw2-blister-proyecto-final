export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los comentarios en citas médicas avisan a todos los miembros del blíster para que nadie pierda una actualización importante.',
  'El panel de notificaciones usa un check para marcar avisos como leídos y la acción de marcar todas aplica el mismo comportamiento en bloque.',
  'Las citas creadas desde MCP aceptan zona horaria IANA, evitando diferencias de hora entre asistentes cuando se indica una hora local.',
  'El onboarding queda recordado en el dispositivo después de verlo, mientras que la repetición manual sigue siendo temporal.',
  'El inicio de sesión recupera el texto “He olvidado la contraseña” y añade una casilla independiente para recordar el identificador de acceso.',
  'Las pantallas de registro y confirmación de correo usan un cierre visual más claro, con el acento aplicado a “correo” y “confirmado”.',
  'Los modales de actualización y novedades incorporan icono en el encabezado y las novedades largas se desplazan sin ocupar toda la pantalla.',
  'Las preferencias de notificaciones se actualizan al momento: al activar las push se solicita el permiso y se registra el dispositivo sin usar un botón de guardado.',
  'Los recordatorios de tomas y citas son más resistentes a pausas del servidor y se envían con prioridad alta para mejorar la entrega en móvil.',
  'La sesión aguanta mejor el uso diario de la PWA: cada dispositivo conserva su propia renovación y el plazo por defecto pasa a 30 días.',
  'Se ha reforzado el cierre de sesión del dispositivo actual para mantener cada instalación aislada.',
] as const;
