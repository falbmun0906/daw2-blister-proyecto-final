export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'El asistente ya puede descubrir tratamientos activos y sus horarios a partir del medicamento para registrar tomas sin depender de IDs internos opacos.',
  'Registrar tomas por MCP es ahora más flexible: si un medicamento solo pertenece a un tratamiento activo, Blíster resuelve ese tratamiento automáticamente.',
  'Las tools de adherencia devuelven mejor contexto cuando hay varias pautas posibles y permiten indicar de forma explícita el estado de la toma.',
] as const;
