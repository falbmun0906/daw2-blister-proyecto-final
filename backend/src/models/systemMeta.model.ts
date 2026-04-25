import { model, models, Schema } from 'mongoose';

import { type SystemMetaDocument } from '../types/system-meta.types';

const systemMetaSchema = new Schema<SystemMetaDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
      default: () => ({}),
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },
  },
);

export const SystemMetaModel =
  models.SystemMeta ?? model<SystemMetaDocument>('SystemMeta', systemMetaSchema);
