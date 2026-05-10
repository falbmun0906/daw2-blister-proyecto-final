import type {
  CreateTreatmentInput,
  Treatment,
  UpdateTreatmentInput,
} from '../../../shared/schemas/treatment.schema';

export type { CreateTreatmentInput, Treatment, UpdateTreatmentInput };

export type TreatmentMedicineEntry = Treatment['medicines'][number];
