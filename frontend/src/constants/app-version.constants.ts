export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Las tomas del mismo tratamiento programadas con pocos minutos de diferencia se registran como dosis distintas, tanto desde Blíster como desde el agente MCP.',
  'Al cambiar la hora de una toma ya registrada, la nueva hora deja de aparecer como tomada por arrastre de la marca anterior.',
  'La detección de duplicados usa la hora programada exacta para evitar conflictos falsos y seguir bloqueando registros repetidos de la misma dosis.',
  'Las alertas «Tras la cita» muestran el nombre de la cita en el detalle: “Tras la cita ‘Nombre’, revisa si hay cambios que aplicar al tratamiento”.',
  'Se incluye el ajuste visual pendiente para mantener el menú de acciones de las tarjetas de aviso alineado arriba a la derecha.',
] as const;
