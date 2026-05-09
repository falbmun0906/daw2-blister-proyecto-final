import { MedicineModel } from '../../models/medicine.model';
import { medicinesUpdate } from '../../modules/medicines/medicines.service';
import { HTTP_STATUS_BAD_REQUEST } from '../../constants/http.constants';
import { AppError } from '../../utils/app-error';
import { type McpStockModifierTool } from '../types';
import { assertMcpWriterRole } from '../context';
import { resolveMcpBlister } from '../blister-resolver';

const getStockStatus = (stock: number, threshold: number): 'ok' | 'low' | 'out' => {
  if (stock === 0) {
    return 'out';
  }

  if (stock <= threshold) {
    return 'low';
  }

  return 'ok';
};

export const stockModifierTool: McpStockModifierTool = {
  name: 'stock_modifier',
  description:
    'Ajusta stock de un medicamento existente con modo set o delta y devuelve el estado final. Acepta blisterId o blisterName para evitar modificaciones en otro botiquin.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    assertMcpWriterRole(blister);

    const medicine = await MedicineModel.findOne({
      _id: input.medicineId,
      blisterId: blister.blisterId,
    });

    if (!medicine) {
      throw new AppError({
        code: 'MEDICINE_NOT_FOUND',
        message: 'Medicine not found in this blister.',
        statusCode: 404,
      });
    }

    const stockBefore = medicine.stock;
    const nextStock = input.mode === 'set' ? input.value : stockBefore + input.value;

    if (nextStock < 0) {
      throw new AppError({
        code: 'MEDICINE_STOCK_NEGATIVE',
        message: 'Stock cannot become negative.',
        statusCode: HTTP_STATUS_BAD_REQUEST,
      });
    }

    const updated = await medicinesUpdate(blister.blisterId, input.medicineId, blister.role, {
      stock: nextStock,
    });

    return {
      blisterId: updated.blisterId,
      medicineId: updated.id,
      medicineName: updated.alias ?? updated.nombre,
      stockBefore,
      stockAfter: updated.stock,
      stockStatus: getStockStatus(updated.stock, updated.threshold),
    };
  },
};
