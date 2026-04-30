import { type Types } from 'mongoose';

export interface AppointmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  date: Date;
  treatmentId?: Types.ObjectId | null;
}
