import { Types } from 'mongoose';

import { type MedicineLookupInput } from '../../../../shared/schemas';
import { MedicineModel } from '../../models/medicine.model';
import { type MedicineDocument } from '../../types/medicine.types';
import { resolveMcpBlisterTargets } from '../blister-resolver';
import { type McpBlisterContext, type McpInventoryItem, type McpMedicineLookupTool } from '../types';

const normalizeText = (value: string): string =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const matchesMedicineText = (input: MedicineLookupInput, item: McpInventoryItem): boolean => {
  if (!input.text) {
    return true;
  }

  const haystack = `${item.nombre} ${item.alias ?? ''} ${item.nregist}`;
  return normalizeText(haystack).includes(normalizeText(input.text));
};

const mapMedicine = (medicine: MedicineDocument, blister: McpBlisterContext): McpInventoryItem => ({
  id: medicine._id.toString(),
  blisterId: medicine.blisterId.toString(),
  blisterName: blister.blisterName,
  role: blister.role,
  nregist: medicine.nregist,
  nombre: medicine.nombre,
  alias: medicine.alias ?? null,
  stock: medicine.stock,
  stockUnit: medicine.stockUnit,
  threshold: medicine.threshold,
  expDate: medicine.expDate,
  cimaStatus: medicine.cimaStatus,
});

export const medicineLookupTool: McpMedicineLookupTool = {
  name: 'medicine_lookup',
  description:
    'Busca medicamentos por id, numero de registro o texto, acotando opcionalmente por blisterId o blisterName para evitar mezclar botiquines.',
  run: async (context, input) => {
    const targetBlisters = resolveMcpBlisterTargets(context, input);
    const blisterById = new Map(targetBlisters.map((blister) => [blister.blisterId, blister]));
    const filter: {
      blisterId: { $in: Types.ObjectId[] };
      _id?: Types.ObjectId;
      nregist?: string;
    } = {
      blisterId: { $in: targetBlisters.map((blister) => new Types.ObjectId(blister.blisterId)) },
    };

    if (input.medicineId) {
      filter._id = new Types.ObjectId(input.medicineId);
    }

    if (input.nregist) {
      filter.nregist = input.nregist;
    }

    const medicines = await MedicineModel.find(filter)
      .sort({ nombre: 1, _id: 1 })
      .limit(500)
      .lean<MedicineDocument[]>();
    const filtered = medicines
      .map((medicine) => {
        const blister = blisterById.get(medicine.blisterId.toString());
        return blister ? mapMedicine(medicine, blister) : null;
      })
      .filter((item): item is McpInventoryItem => item !== null)
      .filter((item) => matchesMedicineText(input, item));
    const offset = (input.page - 1) * input.limit;
    const items = filtered.slice(offset, offset + input.limit);

    return {
      items,
      meta: {
        page: input.page,
        limit: input.limit,
        total: filtered.length,
        totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / input.limit),
      },
    };
  },
};