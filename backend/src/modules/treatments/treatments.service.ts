import { Types } from 'mongoose';

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../../constants/http.constants';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { NotificationModel } from '../../models/notification.model';
import { TreatmentModel } from '../../models/treatment.model';
import { type BlisterMember, type BlisterRole } from '../../types/blister.types';
import { type TreatmentMedicineEntry } from '../../types/treatment.types';
import { AppError } from '../../utils/app-error';
import {
  type CreateTreatmentInput,
  type TreatmentsListQuery,
  type UpdateTreatmentInput,
} from '../../../../shared/schemas';
import { DEFAULT_MEDICATION_TIME_ZONE } from '../../../../shared/schemas/schema.constants';

interface TreatmentMedicineView {
  medicineId: string;
  amount: number;
  firstDoseAt: Date;
  scheduleType: 'interval' | 'daily_times';
  frequencyHours: number | null;
  dailyDoseTimes: string[];
  isRecurring: boolean;
  note: string | null;
}

interface TreatmentView {
  id: string;
  blisterId: string;
  patientUserId: string;
  title: string;
  description: string | null;
  timeZone: string;
  medicines: TreatmentMedicineView[];
  startDate: Date;
  endDate: Date | null;
  active: boolean;
}

interface TreatmentsListResult {
  treatments: TreatmentView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type CreateTreatmentServiceInput = Omit<CreateTreatmentInput, 'timeZone'> & {
  timeZone?: string;
};

const WRITER_ROLES: BlisterRole[] = ['OWNER', 'CAREGIVER'];

const toTreatmentMedicineDocument = (entry: CreateTreatmentServiceInput['medicines'][number]) => ({
  medicineId: new Types.ObjectId(entry.medicineId),
  amount: entry.amount,
  firstDoseAt: entry.firstDoseAt,
  scheduleType: entry.scheduleType,
  frequencyHours: entry.frequencyHours ?? null,
  dailyDoseTimes: entry.dailyDoseTimes,
  isRecurring: entry.isRecurring,
  note: entry.note ?? null,
});

const toTreatmentView = (treatment: Awaited<ReturnType<typeof TreatmentModel.findOne>>): TreatmentView => ({
  id: treatment!._id.toString(),
  blisterId: treatment!.blisterId.toString(),
  patientUserId: treatment!.patientUserId.toString(),
  title: treatment!.title,
  description: treatment!.description ?? null,
  timeZone: treatment!.timeZone ?? DEFAULT_MEDICATION_TIME_ZONE,
  medicines: treatment!.medicines.map((entry: TreatmentMedicineEntry) => ({
    medicineId: entry.medicineId.toString(),
    amount: entry.amount,
    firstDoseAt: entry.firstDoseAt,
    scheduleType: entry.scheduleType ?? 'interval',
    frequencyHours: entry.frequencyHours ?? null,
    dailyDoseTimes: entry.dailyDoseTimes ?? [],
    isRecurring: entry.isRecurring,
    note: entry.note ?? null,
  })),
  startDate: treatment!.startDate,
  endDate: treatment!.endDate ?? null,
  active: treatment!.active,
});

const ensureWriterRole = (blisterRole: BlisterRole): void => {
  if (!WRITER_ROLES.includes(blisterRole)) {
    throw new AppError({
      code: 'BLISTER_ROLE_FORBIDDEN',
      message: 'Your role does not allow this action.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }
};

const getTreatmentDocument = async (blisterId: string, treatmentId: string) => {
  const treatment = await TreatmentModel.findOne({
    _id: new Types.ObjectId(treatmentId),
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  });

  if (!treatment) {
    throw new AppError({
      code: 'TREATMENT_NOT_FOUND',
      message: 'Treatment not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return treatment;
};

const ensureMedicinesBelongToBlister = async (
  blisterId: string,
  medicines: CreateTreatmentServiceInput['medicines'],
): Promise<void> => {
  const medicineIds = [...new Set(medicines.map((entry) => entry.medicineId))];
  const totalMatches = await MedicineModel.countDocuments({
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
    _id: {
      $in: medicineIds.map((medicineId) => new Types.ObjectId(medicineId)),
    },
  });

  if (totalMatches !== medicineIds.length) {
    throw new AppError({
      code: 'TREATMENT_MEDICINE_NOT_FOUND',
      message: 'One or more medicines do not belong to this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }
};

const ensureValidDateRange = (startDate: Date, endDate?: Date | null): void => {
  if (endDate && endDate <= startDate) {
    throw new AppError({
      code: 'TREATMENT_DATE_INVALID',
      message: 'endDate must be later than startDate.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }
};

/**
 * Validates that the patient is currently a member of the blister, so the
 * treatment is always tied to a real person inside the workspace.
 */
const ensurePatientIsBlisterMember = async (
  blisterId: string,
  patientUserId: string,
): Promise<void> => {
  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    deletedAt: null,
  }).lean();

  const isMember = blister?.members?.some(
    (member: BlisterMember) => member.userId.toString() === patientUserId,
  );

  if (!isMember) {
    throw new AppError({
      code: 'TREATMENT_PATIENT_NOT_MEMBER',
      message: 'The selected patient is not a member of this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }
};

/**
 * Lists treatments for a blister with standard collection pagination metadata.
 */
export const treatmentsList = async (
  blisterId: string,
  query: TreatmentsListQuery,
): Promise<TreatmentsListResult> => {
  const { page, limit } = query;
  const filter = {
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  };
  const [treatments, total] = await Promise.all([
    TreatmentModel.find(filter)
      .sort({ active: -1, startDate: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    TreatmentModel.countDocuments(filter),
  ]);

  return {
    treatments: treatments.map((treatment) => toTreatmentView(treatment)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Creates a treatment in the target blister using medicines that belong to the same inventory.
 */
export const treatmentsCreate = async (
  blisterId: string,
  blisterRole: BlisterRole,
  input: CreateTreatmentServiceInput,
): Promise<TreatmentView> => {
  ensureWriterRole(blisterRole);
  ensureValidDateRange(input.startDate, input.endDate ?? null);
  await ensurePatientIsBlisterMember(blisterId, input.patientUserId);
  await ensureMedicinesBelongToBlister(blisterId, input.medicines);

  const treatment = await TreatmentModel.create({
    blisterId: new Types.ObjectId(blisterId),
    patientUserId: new Types.ObjectId(input.patientUserId),
    title: input.title,
    description: input.description ?? null,
    timeZone: input.timeZone ?? DEFAULT_MEDICATION_TIME_ZONE,
    medicines: input.medicines.map((entry) => toTreatmentMedicineDocument(entry)),
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    active: input.active ?? true,
  });

  return toTreatmentView(treatment);
};

/**
 * Updates mutable treatment fields for the target blister.
 */
export const treatmentsUpdate = async (
  blisterId: string,
  treatmentId: string,
  blisterRole: BlisterRole,
  input: UpdateTreatmentInput,
): Promise<TreatmentView> => {
  ensureWriterRole(blisterRole);

  const treatment = await getTreatmentDocument(blisterId, treatmentId);
  const hasEndDate = Object.prototype.hasOwnProperty.call(input, 'endDate');

  if (input.patientUserId !== undefined) {
    await ensurePatientIsBlisterMember(blisterId, input.patientUserId);
    treatment.patientUserId = new Types.ObjectId(input.patientUserId);
  }

  if (input.medicines) {
    await ensureMedicinesBelongToBlister(blisterId, input.medicines);
    treatment.medicines = input.medicines.map((entry) => toTreatmentMedicineDocument(entry));
  }

  const nextStartDate = input.startDate ?? treatment.startDate;
  const nextEndDate = hasEndDate ? input.endDate ?? null : treatment.endDate ?? null;
  ensureValidDateRange(nextStartDate, nextEndDate);

  if (input.title !== undefined) {
    treatment.title = input.title;
  }

  if (input.description !== undefined) {
    treatment.description = input.description ?? null;
  }

  if (input.timeZone !== undefined) {
    treatment.timeZone = input.timeZone;
  }

  if (input.startDate !== undefined) {
    treatment.startDate = input.startDate;
  }

  if (hasEndDate) {
    treatment.endDate = input.endDate ?? null;
  }

  if (input.active !== undefined) {
    treatment.active = input.active;
  }

  await treatment.save();

  return toTreatmentView(treatment);
};

/**
 * Archives a treatment and unlinks it from existing appointments in the same blister.
 */
export const treatmentsDelete = async (
  blisterId: string,
  treatmentId: string,
  blisterRole: BlisterRole,
): Promise<void> => {
  ensureWriterRole(blisterRole);

  const treatment = await getTreatmentDocument(blisterId, treatmentId);
  const now = new Date();

  await AppointmentModel.updateMany(
    {
      blisterId: new Types.ObjectId(blisterId),
      treatmentId: treatment._id,
    },
    {
      $set: {
        treatmentId: null,
      },
    },
  );

  treatment.active = false;
  treatment.deletedAt = now;
  await treatment.save();

  await NotificationModel.deleteMany({
    blisterId: new Types.ObjectId(blisterId),
    dismissedAt: null,
    type: { $in: ['dose_reminder', 'appointment_reminder'] },
    'metadata.treatmentId': treatmentId,
  });
};
