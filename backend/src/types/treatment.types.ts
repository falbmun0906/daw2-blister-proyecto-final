import { type Types } from 'mongoose';

export interface TreatmentMedicineEntry {
  medicineId: Types.ObjectId;
  amount: number;
  frequencyHours: number;
  note?: string | null;
}

export interface TreatmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  description?: string | null;
  medicines: TreatmentMedicineEntry[];
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
}
