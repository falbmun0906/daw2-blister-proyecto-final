import { MedicineModel } from '../../models/medicine.model';
import { externalGetMedicineInfo } from '../../modules/external/external.service';
import { HTTP_STATUS_NOT_FOUND } from '../../constants/http.constants';
import { AppError } from '../../utils/app-error';
import { type McpOfficialSourceLinkerTool } from '../types';
import { resolveMcpBlister } from '../blister-resolver';

const resolveDocByTipo = (
  docs: Array<{ tipo?: number; url?: string }>,
  expectedTipos: number[],
): string | null => {
  for (const tipo of expectedTipos) {
    const found = docs.find((doc) => doc.tipo === tipo && typeof doc.url === 'string' && doc.url.length > 0);

    if (found?.url) {
      return found.url;
    }
  }

  return null;
};

export const officialSourceLinkerTool: McpOfficialSourceLinkerTool = {
  name: 'official_source_linker',
  description:
    'Resuelve enlaces oficiales AEMPS/CIMA (prospecto y ficha tecnica) desde medicineId o nregist ya registrado, opcionalmente acotado por blisterId o blisterName.',
  run: async (context, input) => {
    const accessibleBlisterIds = new Set(context.blisters.map((entry) => entry.blisterId));
    const targetBlister = input.blisterId || input.blisterName ? resolveMcpBlister(context, input) : null;

    let medicine = null as Awaited<ReturnType<typeof MedicineModel.findOne>> | null;

    if (input.medicineId) {
      medicine = await MedicineModel.findById(input.medicineId).lean();

      if (!medicine) {
        throw new AppError({
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found.',
          statusCode: HTTP_STATUS_NOT_FOUND,
        });
      }

      if (targetBlister && medicine.blisterId.toString() !== targetBlister.blisterId) {
        throw new AppError({
          code: 'MEDICINE_NOT_FOUND',
          message: 'Medicine not found in the requested blister.',
          statusCode: HTTP_STATUS_NOT_FOUND,
        });
      }

      if (!accessibleBlisterIds.has(medicine.blisterId.toString())) {
        throw new AppError({
          code: 'BLISTER_ACCESS_FORBIDDEN',
          message: 'You do not have access to this medicine blister.',
          statusCode: 403,
        });
      }
    } else if (input.nregist) {
      const candidates = await MedicineModel.find({
        nregist: input.nregist,
        ...(targetBlister ? { blisterId: targetBlister.blisterId } : {}),
      }).lean();

      medicine = candidates.find((candidate) => accessibleBlisterIds.has(candidate.blisterId.toString())) ?? null;

      if (!medicine) {
        throw new AppError({
          code: 'MEDICINE_NOT_FOUND',
          message: 'No accessible medicine found for the provided nregist.',
          statusCode: HTTP_STATUS_NOT_FOUND,
        });
      }
    }

    if (!medicine) {
      throw new AppError({
        code: 'MEDICINE_NOT_FOUND',
        message: 'medicineId or nregist did not match any accessible medicine.',
        statusCode: HTTP_STATUS_NOT_FOUND,
      });
    }

    const blister = context.blisters.find((entry) => entry.blisterId === medicine.blisterId.toString()) ?? null;
    const official = await externalGetMedicineInfo(medicine.nregist);
    const docs = official.docs
      .filter((doc) => typeof doc.url === 'string' && doc.url.length > 0)
      .map((doc) => ({
        tipo: typeof doc.tipo === 'number' ? doc.tipo : null,
        url: doc.url as string,
        secc: typeof doc.secc === 'boolean' ? doc.secc : null,
      }));

    return {
      medicine: {
        blisterId: medicine.blisterId.toString(),
        blisterName: blister?.blisterName ?? null,
        medicineId: medicine._id.toString(),
        nregist: medicine.nregist,
        nombre: medicine.nombre,
      },
      official: {
        prospectUrl: resolveDocByTipo(official.docs, [2]),
        fichaTecnicaUrl: resolveDocByTipo(official.docs, [1]),
        docs,
      },
    };
  },
};
