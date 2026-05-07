import { type Types } from 'mongoose';

export interface AppointmentCommentDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  location?: string | null;
  description?: string | null;
  date: Date;
  treatmentId?: Types.ObjectId | null;
  comments: AppointmentCommentDocument[];
}
