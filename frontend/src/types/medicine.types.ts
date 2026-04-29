import type {
  CimaMedicineState,
  ExternalMedicineInfo,
  ExternalSearchItem,
  IconType,
  Medicine,
  MedicineCimaStatus,
  StockUnit,
} from '../../../shared/schemas/medicine.schema';

export type {
  CimaMedicineState,
  ExternalMedicineInfo,
  ExternalSearchItem,
  IconType,
  Medicine,
  MedicineCimaStatus,
  StockUnit,
};

/** Nivel de stock derivado de stock vs threshold. */
export type StockLevel = 'ok' | 'low' | 'critical' | 'empty';

/** Nivel de caducidad: ok / 30d / 15d / 7d / vencido. */
export type ExpiryLevel = 'ok' | 'warn-30' | 'warn-15' | 'warn-7' | 'expired';
