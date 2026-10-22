import { apiClient } from './api.client';
import { ApiError, type PaginatedResponse } from '../types/api.types';
import { captureRequestContext } from '../lib/request-context';

/** Explicit page requests stay paged; complete-list consumers follow metadata. */
export async function listCollection<T>(
  url: string,
  parse: (value: unknown) => T,
  options: { page?: number; limit?: number } = {},
): Promise<T[]> {
  const isCurrent = captureRequestContext(undefined, false);
  const items: T[] = [];
  let page = options.page ?? 1;
  const limit = options.limit ?? 100;
  for (;;) {
    const response = await apiClient.get<PaginatedResponse<unknown>>(url, { params: { page, limit } });
    if (!isCurrent()) throw new ApiError('La sesión ha cambiado.', { code: 'AUTH_SESSION_CHANGED' });
    items.push(...response.data.data.map(parse));
    const meta = response.data.meta;
    if (options.page !== undefined || !meta || page >= meta.totalPages) return items;
    if (!Number.isInteger(meta.totalPages) || meta.totalPages > 1000 || response.data.data.length === 0) {
      throw new ApiError('No se ha podido cargar la colección completa. Acota la consulta.', { code: 'PAGINATION_LIMIT' });
    }
    page += 1;
  }
}
