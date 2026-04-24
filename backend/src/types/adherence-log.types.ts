import { type Types } from 'mongoose';

export interface AdherenceLogDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  medicineId: Types.ObjectId;
  userId: Types.ObjectId;
  treatmentId: Types.ObjectId;
  timestamp: Date;
  isForced: boolean;
  notes?: string | null;
}
