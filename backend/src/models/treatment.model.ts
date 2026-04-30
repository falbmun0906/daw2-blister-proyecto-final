import { model, models, Schema } from 'mongoose';

import { type TreatmentDocument } from '../types/treatment.types';

const treatmentMedicineSchema = new Schema<TreatmentDocument['medicines'][number]>(
  {
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    frequencyHours: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const treatmentSchema = new Schema<TreatmentDocument>({
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    required: true,
    index: true,
  },
  patientUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 600,
    default: null,
  },
  medicines: {
    type: [treatmentMedicineSchema],
    required: true,
    validate: {
      validator: (medicines: TreatmentDocument['medicines']) => medicines.length > 0,
      message: 'A treatment must include at least one medicine.',
    },
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    default: null,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
});

treatmentSchema.path('endDate').validate(function validateEndDate(this: TreatmentDocument, value: Date | null | undefined) {
  return !value || value > this.startDate;
}, 'endDate must be later than startDate.');

export const TreatmentModel = models.Treatment ?? model<TreatmentDocument>('Treatment', treatmentSchema);
