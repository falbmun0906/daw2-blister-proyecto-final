import type { MedicineDocument } from '../types/medicine.types';
import type { McpBlisterContext, McpInventoryItem } from './types';

type InventoryMedicine = Omit<MedicineDocument, '_id' | 'blisterId'> & {
  _id: { toString(): string };
  blisterId: { toString(): string };
};

/** Keep REST-backed addition and direct inventory lookups consistent. */
export const toMcpInventoryItem = (
  medicine: InventoryMedicine,
  blister: McpBlisterContext,
): McpInventoryItem => ({
  id: medicine._id.toString(),
  blisterId: medicine.blisterId.toString(),
  blisterName: blister.blisterName,
  role: blister.role,
  source: medicine.source ?? 'cima',
  captureMethod: medicine.captureMethod ?? (medicine.source === 'custom' ? 'manual' : 'search'),
  customDetails: medicine.customDetails ?? null,
  nregist: medicine.nregist,
  cn: medicine.cn ?? null,
  presentationName: medicine.presentationName ?? null,
  nombre: medicine.nombre,
  alias: medicine.alias?.trim() || null,
  stock: medicine.stock,
  stockUnit: medicine.stockUnit,
  threshold: medicine.threshold,
  expDate: medicine.expDate,
  cimaStatus: medicine.cimaStatus,
});
