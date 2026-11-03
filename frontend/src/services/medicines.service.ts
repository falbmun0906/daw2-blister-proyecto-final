import { listCollection } from './pagination';
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
  return listCollection(`/blisters/${blisterId}/medicines`, (item) => medicineSchema.parse(item));
}

/** Crea una entrada CIMA o un producto personalizado en el botiquín. */
export async function createMedicine(
  blisterId: string,
  input: CreateMedicineInput,
): Promise<Medicine> {
  const payload = createMedicineSchema.parse(input);
  const response = await apiClient.post(`/blisters/${blisterId}/medicines`, payload);
  return medicineSchema.parse(normalizeApiResponse(response));
}

/** Actualiza inventario e identidad personalizada si todavía es editable. */
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

/** Archiva un medicamento del botiquín. Requiere OWNER. */
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
