export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los modales de actualización y novedades muestran el icono dentro del encabezado del diálogo, con una estructura visual más clara.',
  'La autorización MCP/OAuth mantiene el indicador de carga visible al enviar el formulario y respeta la política de seguridad del navegador.',
] as const;
