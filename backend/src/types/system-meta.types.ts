import { type Types } from 'mongoose';

export interface CimaSyncMeta {
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  lastCimaSync: string | null;
}

export interface SystemMetaDocument {
  _id: Types.ObjectId;
  key: string;
  value: Record<string, unknown>;
  updatedAt: Date;
}
