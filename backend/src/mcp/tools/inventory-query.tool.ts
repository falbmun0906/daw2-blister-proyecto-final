import { type InventoryQueryInput } from '../../../../shared/schemas';
import { medicinesList } from '../../modules/medicines/medicines.service';
import { type McpAuthContext, type McpInventoryItem, type McpInventoryQueryTool } from '../types';
import { resolveMcpBlisterTargets } from '../blister-resolver';

const isExpired = (expDate: Date): boolean => expDate.getTime() < Date.now();

const isExpiringInDays = (expDate: Date, days: number): boolean => {
  const now = Date.now();
  const cutoff = now + days * 24 * 60 * 60 * 1000;
  const exp = expDate.getTime();

  return exp >= now && exp <= cutoff;
};

const normalizeText = (text?: string): string | null => {
  const normalized = text?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return normalized;
};

const withFilters = (input: InventoryQueryInput, items: McpInventoryItem[]): McpInventoryItem[] => {
  const normalizedText = normalizeText(input.text);

  return items.filter((item) => {
    if (normalizedText) {
      const haystack = `${item.nombre} ${item.alias ?? ''}`.toLowerCase();

      if (!haystack.includes(normalizedText)) {
        return false;
      }
    }

    if (input.stockState === 'out' && item.stock !== 0) {
      return false;
    }

    if (input.stockState === 'low' && (item.stock > item.threshold || item.stock === 0)) {
      return false;
    }

    if (input.expirationState === 'expired' && !isExpired(item.expDate)) {
      return false;
    }

    if (input.expirationState === 'expiring_30d' && !isExpiringInDays(item.expDate, 30)) {
      return false;
    }

    return true;
  });
};

export const inventoryQueryTool: McpInventoryQueryTool = {
  name: 'inventory_query',
  description:
    'Consulta inventario de medicamentos visibles para el usuario MCP, incluyendo stock, umbral y caducidad. Usa blisterId o blisterName cuando el usuario mencione un blister concreto.',
  run: async (context, input) => {
    const targetBlisters = resolveMcpBlisterTargets(context, input);

    const blisterLists = await Promise.all(
      targetBlisters.map(async (blister) => {
        const result = await medicinesList(blister.blisterId, {
          page: 1,
          limit: 100,
        });

        return result.medicines.map<McpInventoryItem>((medicine) => ({
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
        }));
      }),
    );

    const allItems = blisterLists.flat().sort((left, right) => {
      if (left.nombre !== right.nombre) {
        return left.nombre.localeCompare(right.nombre, 'es');
      }

      return left.blisterName.localeCompare(right.blisterName, 'es');
    });

    const filtered = withFilters(input, allItems);
    const offset = (input.page - 1) * input.limit;
    const paged = filtered.slice(offset, offset + input.limit);

    return {
      items: paged,
      meta: {
        page: input.page,
        limit: input.limit,
        total: filtered.length,
        totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / input.limit),
      },
    };
  },
};
