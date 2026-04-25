import { model, models, Schema } from 'mongoose';

import { CIMA_CHANGE_TYPES } from '../constants/domain.constants';
import { type CimaChangeLogDocument } from '../types/cima-change-log.types';

const cimaChangeLogSchema = new Schema<CimaChangeLogDocument>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      default: null,
      index: true,
    },
    nregist: {
      type: String,
      required: true,
      trim: true,
      match: /^\d+$/,
      index: true,
    },
    tipoCambio: {
      type: String,
      enum: CIMA_CHANGE_TYPES,
      required: true,
      trim: true,
    },
    cambios: {
      type: [String],
      required: true,
      default: [],
    },
    fechaCambio: {
      type: Date,
      required: true,
      index: true,
    },
    raw: {
      type: Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
);

export const CimaChangeLogModel =
  models.CimaChangeLog ?? model<CimaChangeLogDocument>('CimaChangeLog', cimaChangeLogSchema);
