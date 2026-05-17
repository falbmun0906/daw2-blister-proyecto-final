import { type Types } from 'mongoose';

export interface TreatmentMedicineEntry {
  medicineId: Types.ObjectId;
  amount: number;
  firstDoseAt: Date;
  scheduleType: 'interval' | 'daily_times';
  frequencyHours?: number | null;
  dailyDoseTimes: string[];
  isRecurring: boolean;
  note?: string | null;
}

export interface TreatmentDocument {
  _id: Types.ObjectId;
  blisterId: Types.ObjectId;
  patientUserId: Types.ObjectId;
  title: string;
  description?: string | null;
  timeZone: string;
  medicines: TreatmentMedicineEntry[];
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
}
