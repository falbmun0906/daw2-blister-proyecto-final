import {
  type CreateMedicineInput,
  type MedicineAddInput,
} from '../../../../shared/schemas';
import { medicinesCreate } from '../../modules/medicines/medicines.service';
import { resolveMcpBlister } from '../blister-resolver';
import {
  type McpBlisterContext,
  type McpInventoryItem,
  type McpMedicineAddTool,
} from '../types';

type CreatedMedicine = Awaited<ReturnType<typeof medicinesCreate>>;

const toCreateMedicineInput = (input: MedicineAddInput): CreateMedicineInput => ({
  nregist: input.nregist,
  alias: input.alias,
  stock: input.stock,
  stockUnit: input.stockUnit,
  threshold: input.threshold,
  expDate: input.expDate,
});

const toMcpInventoryItem = (
  medicine: CreatedMedicine,
  blister: McpBlisterContext,
): McpInventoryItem => ({
  id: medicine.id,
  blisterId: medicine.blisterId,
  blisterName: blister.blisterName,
  role: blister.role,
  nregist: medicine.nregist,
  nombre: medicine.nombre,
  alias: medicine.alias,
  stock: medicine.stock,
  stockUnit: medicine.stockUnit,
  threshold: medicine.threshold,
  expDate: medicine.expDate,
  cimaStatus: medicine.cimaStatus,
});

export const medicineAddTool: McpMedicineAddTool = {
  name: 'medicine_add',
  description:
    'Anade una nueva entrada de medicamento a un blister desde un nregist elegido en CIMA, incluyendo stock, unidad, umbral y caducidad. Permite varias cajas del mismo medicamento.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    const medicine = await medicinesCreate(
      blister.blisterId,
      blister.role,
      toCreateMedicineInput(input),
    );

    return {
      medicine: toMcpInventoryItem(medicine, blister),
    };
  },
};
