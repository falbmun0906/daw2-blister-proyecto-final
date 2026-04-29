const rawApiOrigin = import.meta.env.VITE_API_URL?.trim();

/**
 * Base URL del backend (con prefijo `/api/v1`).
 *
 * - Si `VITE_API_URL` viene definida (p. ej. `http://localhost:3000`), se le
 *   añade el sufijo `/api/v1`.
 * - Si `VITE_API_URL` ya termina en `/api/v1` (compatibilidad), no se duplica.
 * - Si no hay `VITE_API_URL`, se usa `http://localhost:3000/api/v1` para evitar
 *   que axios caiga al puerto de Vite por una baseURL relativa.
 */
function buildApiBaseUrl(origin: string | undefined): string {
  const fallback = 'http://localhost:3000';
  const base = origin && origin.length > 0 ? origin.replace(/\/+$/, '') : fallback;
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
}

export const VITE_API_URL = buildApiBaseUrl(rawApiOrigin);

export const API_TIMEOUT_MS = 10_000;