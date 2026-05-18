export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Las notificaciones pendientes de la campana desaparecen al marcarlas con el check, manteniendo la lista centrada en lo que queda por revisar.',
  'Los comentarios en citas médicas avisan al resto de miembros del blíster sin enviar una notificación al usuario que escribió el comentario.',
  'La pantalla de autorización MCP/OAuth queda más compacta y muestra un indicador de carga al autorizar la conexión.',
  'El onboarding se comporta como en producción: se recuerda en el dispositivo y solo vuelve tras borrar datos de la aplicación o usar una sesión limpia.',
  'El inicio de sesión mantiene “Recordarme” y “He olvidado mi contraseña” en la misma línea para una lectura más cómoda.',
  'Los modales de actualización y novedades ajustan su altura al viewport, mantienen el icono en el encabezado y respetan el marco móvil en escritorio.',
  'La home y las fichas de medicamento/tratamiento son más compactas, con alertas mejor alineadas e imágenes recortadas de forma consistente.',
  'Las alertas CIMA explican mejor cuándo el detalle debe consultarse en los documentos oficiales porque la API solo informa la existencia del aviso.',
  'Las citas creadas desde MCP aceptan zona horaria IANA, evitando diferencias de hora entre asistentes cuando se indica una hora local.',
  'Las pantallas de registro y confirmación de correo usan un cierre visual más claro, con el acento aplicado a “correo” y “confirmado”.',
  'Las preferencias de notificaciones se actualizan al momento: al activar las push se solicita el permiso y se registra el dispositivo sin usar un botón de guardado.',
  'Los recordatorios de tomas y citas son más resistentes a pausas del servidor y se envían con prioridad alta para mejorar la entrega en móvil.',
  'La sesión aguanta mejor el uso diario de la PWA: cada dispositivo conserva su propia renovación y el plazo por defecto pasa a 30 días.',
  'Se ha reforzado el cierre de sesión del dispositivo actual para mantener cada instalación aislada.',
] as const;
