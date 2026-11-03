import { toMcpInventoryItem } from '../medicine-serializer';
import {
  createMedicineSchema,
  type CreateMedicineInput,
  type MedicineAddInput,
} from '../../../../shared/schemas';
import { medicinesCreate } from '../../modules/medicines/medicines.service';
import { resolveMcpBlister } from '../blister-resolver';
import { assertMcpWriterRole } from '../context';
import {
  type McpMedicineAddTool,
} from '../types';

const toCreateMedicineInput = (input: MedicineAddInput): CreateMedicineInput => {
  const { blisterId, blisterName, ...medicine } = input;
  return createMedicineSchema.parse(medicine);
};

export const medicineAddTool: McpMedicineAddTool = {
  name: 'medicine_add',
  description:
    'Añade al botiquín un medicamento CIMA (nregist) o un producto personalizado (source: custom, nombre, customDetails). Confirma con el usuario la identidad, cantidades y caducidad antes de añadir. expDate puede ser null solo para personalizados. No deduce pautas ni verifica datos manuales. Permite varias cajas.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    assertMcpWriterRole(blister);
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
