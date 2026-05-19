import { Types } from 'mongoose';

import { HTTP_STATUS_CONFLICT, HTTP_STATUS_NOT_FOUND } from '../../constants/http.constants';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { adherenceLogsCreate } from '../../modules/adherence/adherence.service';
import { AppError } from '../../utils/app-error';
import { type McpAdherenceLoggerTool } from '../types';
import { assertMcpWriterRole } from '../context';
import { resolveMcpBlister } from '../blister-resolver';

const resolveTreatmentId = async (
  blisterId: string,
  medicineId: string,
  treatmentId?: string,
): Promise<string> => {
  if (treatmentId) {
    return treatmentId;
  }

  const matchingTreatments = await TreatmentModel.find({
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
    active: true,
    'medicines.medicineId': new Types.ObjectId(medicineId),
  })
    .select({ _id: 1, title: 1 })
    .lean<Array<{ _id: Types.ObjectId; title: string }>>();

  if (matchingTreatments.length === 1) {
    return matchingTreatments[0]._id.toString();
  }

  if (matchingTreatments.length === 0) {
    throw new AppError({
      code: 'MCP_TREATMENT_NOT_FOUND',
      message: 'No active treatment matches this medicine in the selected blister. Usa treatment_lookup para descubrir el tratamiento correcto.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  throw new AppError({
    code: 'MCP_TREATMENT_AMBIGUOUS',
    message: 'More than one active treatment matches this medicine. Proporciona treatmentId o usa treatment_lookup para desambiguar.',
    statusCode: HTTP_STATUS_CONFLICT,
    details: matchingTreatments.map((item) => `${item.title} (${item._id.toString()})`),
  });
};

export const adherenceLoggerTool: McpAdherenceLoggerTool = {
  name: 'adherence_logger',
  description:
    'Registra una toma u omision del tratamiento, decrementa stock si procede y devuelve advertencias de consistencia. Si el medicamento solo pertenece a un tratamiento activo del blister, puede resolver treatmentId automaticamente.',
  run: async (context, input) => {
    const blister = resolveMcpBlister(context, input);
    assertMcpWriterRole(blister);
    const resolvedTreatmentId = await resolveTreatmentId(
      blister.blisterId,
      input.medicineId,
      input.treatmentId,
    );

    const log = await adherenceLogsCreate(blister.blisterId, context.userId, blister.role, {
      medicineId: input.medicineId,
      treatmentId: resolvedTreatmentId,
      status: input.status,
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
      status: log.status,
      timestamp: log.timestamp.toISOString(),
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
