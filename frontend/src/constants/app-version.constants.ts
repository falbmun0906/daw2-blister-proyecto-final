export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los modales de actualización y novedades se ajustan mejor al alto del dispositivo y mantienen el icono integrado en el encabezado.',
  'La autorización MCP/OAuth muestra respuesta visual inmediata al pulsar el botón de conexión mientras se procesa el envío.',
  'Las alertas de la pantalla de inicio recuperan el mismo espaciado en cabecera y contenido para una lectura más equilibrada.',
  'Las alertas de detalle de medicamento alinean mejor el icono con el título cuando incluyen texto secundario.',
] as const;
