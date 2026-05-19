export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const APP_COMMIT = typeof __APP_COMMIT__ === 'string' && __APP_COMMIT__ ? __APP_COMMIT__ : 'local';
export const LAST_SEEN_APP_VERSION_KEY = 'blister-last-seen-version';

export const APP_RELEASE_NOTES = [
  'Los borrados de medicamentos, tratamientos, miembros y blísteres aplican ahora reglas de ciclo de vida que protegen el histórico y evitan referencias activas incoherentes.',
  'La edición de perfil incorpora la eliminación de cuenta con aviso explícito, frase de confirmación exacta y cierre de sesiones y accesos vinculados.',
] as const;
