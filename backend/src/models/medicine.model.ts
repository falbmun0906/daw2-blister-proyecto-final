import { model, models, Schema } from 'mongoose';

import {
  CIMA_MEDICINE_STATUS,
  ICON_TYPES,
  STOCK_UNITS,
} from '../constants/domain.constants';
import { type MedicineDocument } from '../types/medicine.types';

const cimaStatusSchema = new Schema<MedicineDocument['cimaStatus']>(
  {
    psum: {
      type: Boolean,
      default: false,
      required: true,
    },
    estado: {
      type: Number,
      enum: CIMA_MEDICINE_STATUS,
      default: 1,
      required: true,
    },
    hasAlerts: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const medicineSchema = new Schema<MedicineDocument>({
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    required: true,
    index: true,
  },
  nregist: {
    type: String,
    required: true,
    trim: true,
    match: /^\d+$/,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  alias: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  pactivos: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  formaOficial: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  dosisOficial: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  iconType: {
    type: String,
    enum: ICON_TYPES,
    required: true,
    trim: true,
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
  },
  stockUnit: {
    type: String,
    enum: STOCK_UNITS,
    required: true,
    trim: true,
  },
  threshold: {
    type: Number,
    required: true,
    min: 0,
    default: 5,
  },
  expDate: {
    type: Date,
    required: true,
  },
  cimaStatus: {
    type: cimaStatusSchema,
    required: true,
    default: () => ({}),
  },
});

medicineSchema.index({ nregist: 1, blisterId: 1 }, { unique: true });

export const MedicineModel = models.Medicine ?? model<MedicineDocument>('Medicine', medicineSchema);
