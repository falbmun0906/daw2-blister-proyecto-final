import type {
  AdherenceLog,
  CreateAdherenceLogInput,
} from '../../../shared/schemas/adherence.schema';

export type { AdherenceLog, CreateAdherenceLogInput };

/**
 * Código de error específico que el backend devuelve con `422` cuando se
 * intenta registrar una toma que dejaría el stock por debajo de cero.
 * La UI debe abrir el `ForceDoseDialog` en vez de mostrar un error genérico.
 */
export const ADHERENCE_STOCK_INSUFFICIENT = 'ADHERENCE_STOCK_INSUFFICIENT';
