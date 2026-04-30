import { type Types } from 'mongoose';

export interface AppointmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  location?: string | null;
  date: Date;
  treatmentId?: Types.ObjectId | null;
}
