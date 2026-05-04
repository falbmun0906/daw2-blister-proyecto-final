import type {
  CreateTreatmentInput,
  Treatment,
  UpdateTreatmentInput,
} from '../../../shared/schemas/treatment.schema';

export type { CreateTreatmentInput, Treatment, UpdateTreatmentInput };

export interface TreatmentMedicineEntry {
  medicineId: string;
  amount: number;
  firstDoseAt: string;
  frequencyHours: number;
  isRecurring: boolean;
  note?: string | null;
}
