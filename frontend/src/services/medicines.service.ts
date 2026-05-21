import {
  createMedicineSchema,
  medicineSchema,
  updateMedicineSchema,
  type CreateMedicineInput,
  type ExternalMedicineInfo,
  type ExternalSearchItem,
  type Medicine,
  type UpdateMedicineInput,
} from '../../../shared/schemas/medicine.schema';

import { apiClient, normalizeApiResponse } from './api.client';

/** Lista el botiquín completo del blíster activo. */
export async function listMedicines(blisterId: string): Promise<Medicine[]> {
  const response = await apiClient.get(`/blisters/${blisterId}/medicines`, {
    params: { page: 1, limit: 100 },
  });
  const raw = normalizeApiResponse<unknown[]>(response);
  return raw.map((item) => medicineSchema.parse(item));
}

/** Crea una entrada de medicamento desde CIMA en el botiquín. */
export async function createMedicine(
  blisterId: string,
  input: CreateMedicineInput,
): Promise<Medicine> {
  const payload = createMedicineSchema.parse(input);
  const response = await apiClient.post(`/blisters/${blisterId}/medicines`, payload);
  return medicineSchema.parse(normalizeApiResponse(response));
}

/** Actualiza campos locales (alias, stock, threshold, expDate). */
export async function updateMedicine(
  blisterId: string,
  medicineId: string,
  input: UpdateMedicineInput,
): Promise<Medicine> {
  const payload = updateMedicineSchema.parse(input);
  const response = await apiClient.patch(
    `/blisters/${blisterId}/medicines/${medicineId}`,
    payload,
  );
  return medicineSchema.parse(normalizeApiResponse(response));
}

/** Elimina un medicamento del botiquín. Requiere OWNER o CAREGIVER. */
export async function removeMedicine(
  blisterId: string,
  medicineId: string,
): Promise<void> {
  await apiClient.delete(`/blisters/${blisterId}/medicines/${medicineId}`);
}

/** Obtiene un medicamento concreto buscándolo en la lista (no hay endpoint /:id). */
export async function getMedicine(
  blisterId: string,
  medicineId: string,
): Promise<Medicine | null> {
  const list = await listMedicines(blisterId);
  return list.find((m) => m._id === medicineId) ?? null;
}

export type { ExternalMedicineInfo, ExternalSearchItem };
