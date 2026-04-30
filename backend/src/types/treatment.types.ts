import { type Types } from 'mongoose';

export interface TreatmentMedicineEntry {
  medicineId: Types.ObjectId;
  amount: number;
  frequencyHours: number;
}

export interface TreatmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  medicines: TreatmentMedicineEntry[];
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
}
