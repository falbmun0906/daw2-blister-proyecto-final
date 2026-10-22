import { model, models, Schema } from 'mongoose';

import { type AdherenceLogDocument } from '../types/adherence-log.types';

const adherenceLogSchema = new Schema<AdherenceLogDocument>({
  deductedAmount: { type: Number, min: 0 },
  patientUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  stockUnit: { type: String },
  occurrenceKey: { type: String },
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    required: true,
    index: true,
  },
  medicineId: {
    type: Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  treatmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Treatment',
    required: true,
  },
  status: {
    type: String,
    enum: ['taken', 'skipped'],
    required: true,
    default: 'taken',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  isForced: {
    type: Boolean,
    required: true,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
  },
}, {
  timestamps: true,
});

adherenceLogSchema.index({ blisterId: 1, timestamp: -1 });
// Legacy logs are left intact; new writes have a stable occurrence identity.
adherenceLogSchema.index({ occurrenceKey: 1 }, { unique: true, sparse: true });

export const AdherenceLogModel =
  models.AdherenceLog ?? model<AdherenceLogDocument>('AdherenceLog', adherenceLogSchema);
