import {
  createTreatmentSchema,
  treatmentSchema,
  updateTreatmentSchema,
  type CreateTreatmentInput,
  type Treatment,
  type UpdateTreatmentInput,
} from '../../../shared/schemas/treatment.schema';

import { apiClient, normalizeApiResponse } from './api.client';

interface ListOptions {
  page?: number;
  limit?: number;
}

/** Lista los tratamientos del blíster activo. */
export async function listTreatments(
  blisterId: string,
  options: ListOptions = {},
): Promise<Treatment[]> {
  const { page = 1, limit = 100 } = options;
  const response = await apiClient.get(`/blisters/${blisterId}/treatments`, {
    params: { page, limit },
  });
  const raw = normalizeApiResponse<unknown[]>(response);
  return raw.map((item) => treatmentSchema.parse(item));
}

/** Crea un tratamiento. Requiere OWNER o CAREGIVER. */
export async function createTreatment(
  blisterId: string,
  input: CreateTreatmentInput,
): Promise<Treatment> {
  const payload = createTreatmentSchema.parse(input);
  const response = await apiClient.post(`/blisters/${blisterId}/treatments`, payload);
  return treatmentSchema.parse(normalizeApiResponse(response));
}

/** Actualiza un tratamiento existente. */
export async function updateTreatment(
  blisterId: string,
  treatmentId: string,
  input: UpdateTreatmentInput,
): Promise<Treatment> {
  const payload = updateTreatmentSchema.parse(input);
  const response = await apiClient.patch(
    `/blisters/${blisterId}/treatments/${treatmentId}`,
    payload,
  );
  return treatmentSchema.parse(normalizeApiResponse(response));
}

/** Elimina un tratamiento. Desvincula `treatmentId` de citas relacionadas. */
export async function removeTreatment(blisterId: string, treatmentId: string): Promise<void> {
  await apiClient.delete(`/blisters/${blisterId}/treatments/${treatmentId}`);
}
