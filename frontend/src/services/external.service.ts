import DOMPurify from 'dompurify';

import {
  externalMedicineInfoSchema,
  externalSearchItemSchema,
  type ExternalMedicineInfo,
  type ExternalSearchItem,
} from '../../../shared/schemas/medicine.schema';

import { apiClient, normalizeApiResponse } from './api.client';

/**
 * Sanea texto procedente de CIMA. Solo se aceptan caracteres planos: cualquier
 * etiqueta HTML se elimina por completo. Se aplica a todos los campos textuales
 * antes de devolverlos al consumidor (UI, store, etc.).
 */
function sanitize(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function sanitizeOptional(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  return sanitize(text);
}

function sanitizeSearchItem(raw: ExternalSearchItem): ExternalSearchItem {
  return {
    nregist: sanitize(raw.nregist),
    nombre: sanitize(raw.nombre),
    pactivos: sanitize(raw.pactivos),
    labtitular: sanitizeOptional(raw.labtitular),
    formaOficial: sanitizeOptional(raw.formaOficial),
    dosisOficial: sanitizeOptional(raw.dosisOficial),
    fotoUrl: sanitizeOptional(raw.fotoUrl ?? null),
  };
}

function sanitizeInfo(raw: ExternalMedicineInfo): ExternalMedicineInfo {
  return {
    ...raw,
    nregist: sanitize(raw.nregist),
    nombre: sanitize(raw.nombre),
    pactivos: sanitize(raw.pactivos),
    labtitular: sanitizeOptional(raw.labtitular),
    formaOficial: sanitizeOptional(raw.formaOficial),
    formaSimplificada: sanitizeOptional(raw.formaSimplificada),
    dosisOficial: sanitizeOptional(raw.dosisOficial),
  };
}

/** Busca medicamentos en CIMA por texto libre. */
export async function searchCima(query: string): Promise<ExternalSearchItem[]> {
  const response = await apiClient.get('/external/search', {
    params: { q: query },
  });
  const raw = normalizeApiResponse<unknown[]>(response);
  return raw.map((item) => sanitizeSearchItem(externalSearchItemSchema.parse(item)));
}

/** Obtiene la ficha oficial detallada de un medicamento por nregist. */
export async function getCimaDetail(nregist: string): Promise<ExternalMedicineInfo> {
  const response = await apiClient.get(`/external/info/${nregist}`);
  return sanitizeInfo(externalMedicineInfoSchema.parse(normalizeApiResponse(response)));
}
