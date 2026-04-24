import { model, models, Schema } from 'mongoose';

import { SYSTEM_SYNC_STATUS } from '../constants/domain.constants';
import { type SystemMetaDocument } from '../types/system-meta.types';

const systemMetaSchema = new Schema<SystemMetaDocument>({
  lastCimaSync: {
    type: Date,
    required: true,
    default: () => new Date(0),
  },
  syncStatus: {
    type: String,
    enum: SYSTEM_SYNC_STATUS,
    required: true,
    default: 'idle',
    trim: true,
  },
});

export const SystemMetaModel =
  models.SystemMeta ?? model<SystemMetaDocument>('SystemMeta', systemMetaSchema);
