import { model, models, Schema } from 'mongoose';

import {
  CIMA_MEDICINE_STATUS,
  ICON_TYPES,
  STOCK_UNITS,
} from '../constants/domain.constants';
import { type MedicineDocument } from '../types/medicine.types';

const cimaStatusSchema = new Schema<NonNullable<MedicineDocument['cimaStatus']>>(
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
    comerc: {
      type: Boolean,
      default: false,
      required: true,
    },
    notas: {
      type: Boolean,
      default: false,
      required: true,
    },
    materialesInf: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const isOfficial = function (this: MedicineDocument): boolean {
  return this.source !== 'custom';
};
const customDetailsSchema = new Schema({
  productType: { type: String, enum: ['medicine', 'supplement', 'other'], required: true },
  brand: { type: String, trim: true, maxlength: 100 },
  composition: { type: String, trim: true, maxlength: 300 },
  format: { type: String, trim: true, maxlength: 100 },
  strength: { type: String, trim: true, maxlength: 100 },
}, { _id: false });

const medicineSchema = new Schema<MedicineDocument>({
  identityLocked: { type: Boolean, default: false },
  source: { type: String, enum: ['cima', 'custom'], default: 'cima', immutable: true },
  cn: { type: String, match: /^\d{6}$/, default: null },
  presentationName: { type: String, maxlength: 400, default: null },
  captureMethod: {
    type: String,
    enum: ['search', 'manual', 'ocr', 'barcode'],
    default: 'search',
    immutable: true,
  },
  customDetails: {
    type: customDetailsSchema,
    required: function () { return this.source === 'custom'; },
    default: null,
  },
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    required: true,
    index: true,
  },
  nregist: {
    type: String,
    required: isOfficial,
    default: null,
    trim: true,
    match: /^\d+$/,
    validate: {
      validator: function (value: unknown) { return this.get('source') !== 'custom' || value == null; },
      message: 'Un producto personalizado no tiene registro CIMA.',
    },
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
    required: isOfficial,
    default: null,
    trim: true,
    maxlength: 300,
  },
  formaOficial: {
    type: String,
    required: isOfficial,
    default: null,
    trim: true,
    maxlength: 200,
  },
  dosisOficial: {
    type: String,
    required: isOfficial,
    default: null,
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
    required: isOfficial,
    default: null,
  },
  cimaStatus: {
    type: cimaStatusSchema,
    required: isOfficial,
    default: function () { return this.source === 'custom' ? null : {}; },
    validate: {
      validator: function (value: unknown) { return this.get('source') !== 'custom' || value == null; },
      message: 'Un producto personalizado no tiene estado CIMA.',
    },
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

medicineSchema.index({ blisterId: 1, nregist: 1 });
medicineSchema.index({ blisterId: 1, deletedAt: 1 });
medicineSchema.set('optimisticConcurrency', true);

export const MedicineModel = models.Medicine ?? model<MedicineDocument>('Medicine', medicineSchema);
