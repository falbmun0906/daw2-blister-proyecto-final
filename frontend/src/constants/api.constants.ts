const rawApiOrigin = import.meta.env.VITE_API_URL?.trim();
const rawMcpOrigin = import.meta.env.VITE_MCP_URL?.trim();

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

function stripApiPrefix(origin: string): string {
  return origin.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
}

function appendMcpPath(origin: string): string {
  const base = origin.replace(/\/+$/, '');
  return base.endsWith('/mcp') ? base : `${base}/mcp`;
}

function buildLocalMcpUrl(apiBaseUrl: string): string | null {
  try {
    const url = new URL(stripApiPrefix(apiBaseUrl));
    const port = Number.parseInt(url.port, 10);

    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !Number.isInteger(port)) {
      return null;
    }

    url.port = String(port + 1);
    url.pathname = '/mcp';
    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

function buildMcpBaseUrl(origin: string | undefined, apiBaseUrl: string): string {
  if (origin && origin.length > 0) {
    return appendMcpPath(origin);
  }

  return buildLocalMcpUrl(apiBaseUrl) ?? appendMcpPath(stripApiPrefix(apiBaseUrl));
}

export const VITE_API_URL = buildApiBaseUrl(rawApiOrigin);
export const VITE_MCP_URL = buildMcpBaseUrl(rawMcpOrigin, VITE_API_URL);

export const API_TIMEOUT_MS = 10_000;
