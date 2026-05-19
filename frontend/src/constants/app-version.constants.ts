export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Las alertas «Tras la cita» del inicio muestran ahora el nombre de la cita relacionada para identificarla de un vistazo.',
  'Puedes marcar como tomada cualquier dosis de la línea de tiempo; si aún no es la hora, se muestra un aviso antes de descontar stock.',
  'Los modales para eliminar medicamentos, tratamientos, citas y comentarios siguen el mismo estilo unificado que el resto de avisos del inicio.',
  'El menú de acciones (tres puntos) en las tarjetas de avisos queda anclado arriba a la derecha para una lectura más limpia.',
  'La integración con el agente MCP es más consistente: las tomas registradas se reconocen en el inicio y se evita restar stock dos veces para la misma dosis programada, con permisos por rol reforzados.',
] as const;
