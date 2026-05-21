import { Types } from 'mongoose';

import { type MedicineCatalogSearchInput } from '../../../../shared/schemas';
import { MedicineModel } from '../../models/medicine.model';
import { externalSearchMedicines } from '../../modules/external/external.service';
import { type ExternalSearchItem } from '../../modules/external/external.types';
import { resolveMcpBlisterTargets } from '../blister-resolver';
import {
  type McpAuthContext,
  type McpBlisterContext,
  type McpMedicineCatalogItem,
  type McpMedicineCatalogSearchTool,
} from '../types';

const countExistingEntries = async (
  targetBlisters: McpBlisterContext[],
  nregist: string,
): Promise<number> =>
  MedicineModel.countDocuments({
    blisterId: { $in: targetBlisters.map((blister) => new Types.ObjectId(blister.blisterId)) },
    nregist,
  });

const mapCatalogItem = (
  item: ExternalSearchItem,
  existingInTargetBlisters: number,
): McpMedicineCatalogItem => ({
  nregist: item.nregist,
  nombre: item.nombre,
  pactivos: item.pactivos,
  labtitular: item.labtitular,
  formaOficial: item.formaOficial,
  dosisOficial: item.dosisOficial,
  fotoUrl: item.fotoUrl,
  existingInTargetBlisters,
});

const resolveSearchTargets = (
  context: McpAuthContext,
  input: MedicineCatalogSearchInput,
): McpBlisterContext[] => resolveMcpBlisterTargets(context, input);

export const medicineCatalogSearchTool: McpMedicineCatalogSearchTool = {
  name: 'medicine_catalog_search',
  description:
    'Busca medicamentos en el catalogo oficial CIMA por nombre comercial para poder elegir un nregist antes de anadirlo a un blister.',
  run: async (context, input) => {
    const targetBlisters = resolveSearchTargets(context, input);
    const matches = await externalSearchMedicines(input.commercialName);
    const offset = (input.page - 1) * input.limit;
    const pageItems = matches.slice(offset, offset + input.limit);
    const existingCounts = await Promise.all(
      pageItems.map((item) => countExistingEntries(targetBlisters, item.nregist)),
    );

    return {
      items: pageItems.map((item, index) => mapCatalogItem(item, existingCounts[index] ?? 0)),
      meta: {
        page: input.page,
        limit: input.limit,
        total: matches.length,
        totalPages: matches.length === 0 ? 0 : Math.ceil(matches.length / input.limit),
      },
    };
  },
};
