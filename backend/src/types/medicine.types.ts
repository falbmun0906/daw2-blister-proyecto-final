import { type Types } from 'mongoose';

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
  nregist: string;
  nombre: string;
  alias?: string | null;
  pactivos: string;
  formaOficial: string;
  dosisOficial: string;
  iconType: IconType;
  stock: number;
  stockUnit: StockUnit;
  threshold: number;
  expDate: Date;
  cimaStatus: MedicineCimaStatus;
  deletedAt?: Date | null;
}
