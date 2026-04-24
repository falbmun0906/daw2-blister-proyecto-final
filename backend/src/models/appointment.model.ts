import { model, models, Schema } from 'mongoose';

import { type AppointmentDocument } from '../types/appointment.types';

const appointmentSchema = new Schema<AppointmentDocument>({
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
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
});

appointmentSchema.index({ blisterId: 1, date: 1 });

export const AppointmentModel =
  models.Appointment ?? model<AppointmentDocument>('Appointment', appointmentSchema);
