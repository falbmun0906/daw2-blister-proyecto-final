import { model, models, Schema } from 'mongoose';

import { type AppointmentDocument } from '../types/appointment.types';

const appointmentCommentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: true, id: false },
);

const appointmentSchema = new Schema<AppointmentDocument>({
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
  location: {
    type: String,
    trim: true,
    maxlength: 200,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 600,
    default: null,
  },
  date: {
    type: Date,
    required: true,
  },
  treatmentId: {
    type: Schema.Types.ObjectId,
    ref: 'Treatment',
    default: null,
  },
  comments: {
    type: [appointmentCommentSchema],
    default: [],
  },
});

appointmentSchema.index({ blisterId: 1, date: 1 });

export const AppointmentModel =
  models.Appointment ?? model<AppointmentDocument>('Appointment', appointmentSchema);
