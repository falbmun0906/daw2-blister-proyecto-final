import { model, models, Schema } from 'mongoose';

import { DEFAULT_MEDICATION_TIME_ZONE } from '../../../shared/schemas/schema.constants';
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
      min: 0.5,
    },
    firstDoseAt: {
      type: Date,
      required: true,
    },
    scheduleType: {
      type: String,
      enum: ['interval', 'daily_times'],
      required: true,
      default: 'interval',
    },
    frequencyHours: {
      type: Number,
      min: 1,
      default: null,
    },
    dailyDoseTimes: {
      type: [String],
      default: [],
    },
    isRecurring: {
      type: Boolean,
      required: true,
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

treatmentMedicineSchema.path('dailyDoseTimes').validate(function validateDailyDoseTimes(this: TreatmentDocument['medicines'][number], value: string[] | undefined) {
  const times = value ?? [];

  if (!times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    return false;
  }

  if (new Set(times).size !== times.length) {
    return false;
  }

  if (this.isRecurring && this.scheduleType === 'daily_times') {
    return times.length > 0;
  }

  return true;
}, 'dailyDoseTimes must contain unique HH:mm values and at least one time for recurring daily schedules.');

treatmentMedicineSchema.path('frequencyHours').validate(function validateFrequencyHours(this: TreatmentDocument['medicines'][number], value: number | null | undefined) {
  if (this.isRecurring && this.scheduleType === 'interval') {
    return typeof value === 'number' && value > 0;
  }

  return value == null;
}, 'frequencyHours is required for recurring interval schedules and must be empty for other schedules.');

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
  timeZone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: DEFAULT_MEDICATION_TIME_ZONE,
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

treatmentSchema.path('timeZone').validate((value: string | undefined) => {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'timeZone must be a valid IANA timezone.');

export const TreatmentModel = models.Treatment ?? model<TreatmentDocument>('Treatment', treatmentSchema);
