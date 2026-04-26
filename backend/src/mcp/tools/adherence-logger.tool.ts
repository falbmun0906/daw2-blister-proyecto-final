import { MedicineModel } from '../../models/medicine.model';
import { adherenceLogsCreate } from '../../modules/adherence/adherence.service';
import { type McpAdherenceLoggerTool } from '../types';
import { assertMcpBlisterAccess, assertMcpWriterRole } from '../context';

export const adherenceLoggerTool: McpAdherenceLoggerTool = {
  name: 'adherence_logger',
  description:
    'Registra una toma del tratamiento, decrementa stock y devuelve advertencias de consistencia.',
  run: async (context, input) => {
    const blister = assertMcpBlisterAccess(context, input.blisterId);
    assertMcpWriterRole(blister);

    const log = await adherenceLogsCreate(input.blisterId, context.userId, blister.role, {
      medicineId: input.medicineId,
      treatmentId: input.treatmentId,
      amount: input.amount,
      force: input.forced,
      timestamp: input.timestamp,
      notes: input.notes,
    });

    const medicine = await MedicineModel.findById(input.medicineId).lean();

    return {
      logId: log.id,
      blisterId: log.blisterId,
      treatmentId: log.treatmentId,
      medicineId: log.medicineId,
      timestamp: (input.timestamp ?? log.timestamp).toISOString(),
      isForced: log.isForced,
      stockAfter: medicine?.stock ?? 0,
      warning: log.isForced
        ? 'Toma registrada en modo forzado por stock insuficiente.'
        : medicine && medicine.stock <= medicine.threshold
          ? 'Stock bajo tras registrar la toma.'
          : null,
    };
  },
};
