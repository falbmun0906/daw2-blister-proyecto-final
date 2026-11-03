import { type Types } from 'mongoose';
import type { CustomMedicineDetails } from '../../../shared/schemas/medicine.schema';

import {
  type CIMA_MEDICINE_STATUS,
  type ICON_TYPES,
  type STOCK_UNITS,
} from '../constants/domain.constants';

export type StockUnit = (typeof STOCK_UNITS)[number];
export type IconType = (typeof ICON_TYPES)[number];
export type CimaMedicineState = (typeof CIMA_MEDICINE_STATUS)[number];

export interface MedicineCimaStatus {
  psum: boolean;
  estado: CimaMedicineState;
  hasAlerts: boolean;
  comerc: boolean;
  notas: boolean;
  materialesInf: boolean;
}

export interface MedicineDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  source?: 'cima' | 'custom';
  identityLocked?: boolean;
  captureMethod?: 'search' | 'manual' | 'ocr' | 'barcode';
  customDetails?: CustomMedicineDetails | null;
  nregist: string | null;
  cn?: string | null;
  presentationName?: string | null;
  nombre: string;
  alias?: string | null;
  pactivos: string | null;
  formaOficial: string | null;
  dosisOficial: string | null;
  iconType: IconType;
  stock: number;
  stockUnit: StockUnit;
  threshold: number;
  expDate: Date | null;
  cimaStatus: MedicineCimaStatus | null;
  deletedAt?: Date | null;
}
