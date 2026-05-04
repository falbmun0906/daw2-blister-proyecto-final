import {
  adherenceLogSchema,
  createAdherenceLogSchema,
  type AdherenceLog,
  type CreateAdherenceLogInput,
} from '../../../shared/schemas/adherence.schema';

import { apiClient, normalizeApiResponse } from './api.client';

interface ListOptions {
  page?: number;
  limit?: number;
}

/** Lista el historial de tomas registradas en el blíster activo. */
export async function listAdherenceLogs(
  blisterId: string,
  options: ListOptions = {},
): Promise<AdherenceLog[]> {
  const { page = 1, limit = 50 } = options;
  const response = await apiClient.get(`/blisters/${blisterId}/logs`, {
    params: { page, limit },
  });
  const raw = normalizeApiResponse<unknown[]>(response);
  return raw.map((item) => adherenceLogSchema.parse(item));
}

/**
 * Registra una toma. Si el stock no es suficiente y `force` no está activado,
 * el backend responde `422 ADHERENCE_STOCK_INSUFFICIENT` y la UI debe abrir
 * el `ForceDoseDialog` antes de reintentar con `force: true` y `notes`.
 */
export async function logDose(
  blisterId: string,
  input: CreateAdherenceLogInput,
): Promise<AdherenceLog> {
  const payload = createAdherenceLogSchema.parse(input);
  const response = await apiClient.post(`/blisters/${blisterId}/logs`, payload);
  return adherenceLogSchema.parse(normalizeApiResponse(response));
}

/** Elimina (deshace) un log dentro de la ventana permitida. */
export async function undoLog(blisterId: string, logId: string): Promise<void> {
  await apiClient.delete(`/blisters/${blisterId}/logs/${logId}`);
}
