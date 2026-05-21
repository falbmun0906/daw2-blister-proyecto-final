import { type Types } from 'mongoose';

import { type CIMA_CHANGE_TYPES } from '../constants/domain.constants';

export type CimaChangeType = (typeof CIMA_CHANGE_TYPES)[number];

export interface CimaChangeLogDocument {
  _id: Types.ObjectId;
  medicineId?: Types.ObjectId | null;
  nregist: string;
  tipoCambio: CimaChangeType;
  cambios: string[];
  fechaCambio: Date;
  raw?: Record<string, unknown> | null;
  createdAt: Date;
}
