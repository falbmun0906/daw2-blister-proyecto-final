import { type Types } from 'mongoose';

import { type adherenceLogStatuses } from '../../../shared/schemas/schema.constants';

export type AdherenceLogStatus = typeof adherenceLogStatuses[number];

export interface AdherenceLogDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  medicineId: Types.ObjectId;
  userId: Types.ObjectId;
  treatmentId: Types.ObjectId;
  status: AdherenceLogStatus;
  amount: number;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
  isForced: boolean;
  notes?: string | null;
}
