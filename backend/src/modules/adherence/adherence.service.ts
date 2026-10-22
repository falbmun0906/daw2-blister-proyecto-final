import { Types, type ClientSession } from 'mongoose';
import { inTransaction } from '../../utils/transaction';

import { ADHERENCE_LOG_UNDO_WINDOW_MS } from '../../constants/domain.constants';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_UNPROCESSABLE_ENTITY,
} from '../../constants/http.constants';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { type BlisterRole } from '../../types/blister.types';
import { type TreatmentMedicineEntry } from '../../types/treatment.types';
import { AppError } from '../../utils/app-error';
import {
  computeDosesInRange,
  computeScheduleAlignmentWindowMs,
  computeScheduleToleranceMs,
} from '../../utils/dose-schedule';
import { getMedicationTimeZone } from '../../utils/time-zone';
import {
  notifyAdherenceForced,
  notifyStockLow,
} from '../notifications/notifications.service';
import {
  type AdherenceLogsListQuery,
  type CreateAdherenceLogInput,
} from '../../../../shared/schemas';

interface AdherenceLogView {
  id: string;
  blisterId: string;
  medicineId: string;
  userId: string;
  treatmentId: string;
  status: 'taken' | 'skipped';
  amount: number;
  deductedAmount: number;
  patientUserId: string | null;
  stockUnit: string | null;
  timestamp: Date;
  createdAt: Date;
  isForced: boolean;
  notes: string | null;
}

interface AdherenceLogsListResult {
  logs: AdherenceLogView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const WRITER_ROLES: BlisterRole[] = ['OWNER', 'CAREGIVER'];

const toAdherenceLogView = (
  adherenceLog: Awaited<ReturnType<typeof AdherenceLogModel.findOne>>,
): AdherenceLogView => ({
  id: adherenceLog!._id.toString(),
  blisterId: adherenceLog!.blisterId.toString(),
  medicineId: adherenceLog!.medicineId.toString(),
  userId: adherenceLog!.userId.toString(),
  treatmentId: adherenceLog!.treatmentId.toString(),
  status: adherenceLog!.status ?? 'taken',
  amount: adherenceLog!.amount,
  deductedAmount: adherenceLog!.deductedAmount ?? adherenceLog!.amount,
  patientUserId: adherenceLog!.patientUserId?.toString() ?? null,
  stockUnit: adherenceLog!.stockUnit ?? null,
  timestamp: adherenceLog!.timestamp,
  createdAt: adherenceLog!.createdAt ?? adherenceLog!.timestamp,
  isForced: adherenceLog!.isForced,
  notes: adherenceLog!.notes ?? null,
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

const getMedicineDocument = async (blisterId: string, medicineId: string, session?: ClientSession) => {
  const medicine = await MedicineModel.findOne({
    _id: new Types.ObjectId(medicineId),
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  }).session(session ?? null);

  if (!medicine) {
    throw new AppError({
      code: 'MEDICINE_NOT_FOUND',
      message: 'Medicine not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return medicine;
};

const getTreatmentDocument = async (blisterId: string, treatmentId: string, session?: ClientSession) => {
  const treatment = await TreatmentModel.findOne({
    _id: new Types.ObjectId(treatmentId),
    blisterId: new Types.ObjectId(blisterId),
    deletedAt: null,
  }).session(session ?? null);

  if (!treatment) {
    throw new AppError({
      code: 'TREATMENT_NOT_FOUND',
      message: 'Treatment not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return treatment;
};

const getBlisterDocument = async (blisterId: string, session?: ClientSession) => {
  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    deletedAt: null,
  }).session(session ?? null);

  if (!blister) {
    throw new AppError({
      code: 'BLISTER_NOT_FOUND',
      message: 'Blister not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return blister;
};

const getAdherenceLogDocument = async (blisterId: string, adherenceLogId: string, session?: ClientSession) => {
  const adherenceLog = await AdherenceLogModel.findOne({
    _id: new Types.ObjectId(adherenceLogId),
    blisterId: new Types.ObjectId(blisterId),
  }).session(session ?? null);

  if (!adherenceLog) {
    throw new AppError({
      code: 'ADHERENCE_LOG_NOT_FOUND',
      message: 'Adherence log not found in this blister.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return adherenceLog;
};

const getTreatmentMedicineEntry = (
  treatmentMedicines: TreatmentMedicineEntry[],
  medicineId: string,
): TreatmentMedicineEntry => {
  const treatmentMedicine = treatmentMedicines.find(
    (entry) => entry.medicineId.toString() === medicineId,
  );

  if (!treatmentMedicine) {
    throw new AppError({
      code: 'ADHERENCE_TREATMENT_MEDICINE_NOT_FOUND',
      message: 'The selected medicine does not belong to the selected treatment.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  return treatmentMedicine;
};

const resolveRequestedAmount = (inputAmount: number | undefined, treatmentAmount: number): number => {
  const requestedAmount = inputAmount ?? treatmentAmount;

  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new AppError({
      code: 'ADHERENCE_AMOUNT_INVALID',
      message: 'The amount must be greater than 0.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  return requestedAmount;
};

interface ResolveDoseAlignmentResult {
  effectiveTimestamp: Date;
  toleranceMs: number;
}

/**
 * Resolves the effective timestamp for an adherence log by snapping the request
 * time to the closest scheduled dose (within tolerance) so that logs created by
 * different callers (Home, MCP, manual) bind to the same scheduled occurrence.
 */
const resolveDoseAlignment = (
  treatment: Awaited<ReturnType<typeof getTreatmentDocument>>,
  treatmentMedicine: TreatmentMedicineEntry,
  requestedTimestamp: Date,
): ResolveDoseAlignmentResult => {
  const scheduleType: 'interval' | 'daily_times' = treatmentMedicine.scheduleType ?? 'interval';
  const entry = {
    firstDoseAt: treatmentMedicine.firstDoseAt,
    scheduleType,
    frequencyHours: treatmentMedicine.frequencyHours ?? null,
    dailyDoseTimes: treatmentMedicine.dailyDoseTimes ?? [],
    isRecurring: Boolean(treatmentMedicine.isRecurring),
  } as const;
  const alignmentWindowMs = computeScheduleAlignmentWindowMs(entry);
  const toleranceMs = computeScheduleToleranceMs(entry);
  const source = {
    startDate: treatmentMedicine.firstDoseAt,
    endDate: treatment.endDate ?? null,
    active: Boolean(treatment.active),
    timeZone: getMedicationTimeZone(treatment.timeZone ?? null),
  };
  const from = new Date(requestedTimestamp.getTime() - alignmentWindowMs);
  const to = new Date(requestedTimestamp.getTime() + alignmentWindowMs);
  const occurrences = computeDosesInRange(source, entry, from, to, 16);
  let nearest: Date | null = null;
  let nearestDelta = Number.POSITIVE_INFINITY;
  for (const doseAt of occurrences) {
    const delta = Math.abs(doseAt.getTime() - requestedTimestamp.getTime());
    if (delta < nearestDelta) {
      nearest = doseAt;
      nearestDelta = delta;
    }
  }
  return {
    effectiveTimestamp: nearest ?? requestedTimestamp,
    toleranceMs,
  };
};

/**
 * Lists adherence logs for a blister with standard collection pagination metadata.
 */
export const adherenceLogsList = async (
  blisterId: string,
  query: AdherenceLogsListQuery,
): Promise<AdherenceLogsListResult> => {
  const { page, limit } = query;
  const filter = {
    blisterId: new Types.ObjectId(blisterId),
  };
  const [adherenceLogs, total] = await Promise.all([
    AdherenceLogModel.find(filter)
      .sort({ timestamp: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AdherenceLogModel.countDocuments(filter),
  ]);

  return {
    logs: adherenceLogs.map((adherenceLog) => toAdherenceLogView(adherenceLog)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Registers an adherence log and updates medicine stock according to force rules.
 */
export const adherenceLogsCreate = async (
  blisterId: string,
  userId: string,
  blisterRole: BlisterRole,
  input: CreateAdherenceLogInput,
): Promise<AdherenceLogView> => {
  ensureWriterRole(blisterRole);

  const committed = await inTransaction(async (session) => {
    const blister = await getBlisterDocument(blisterId, session);
    const member = blister.members.find((entry: { userId: Types.ObjectId }) => entry.userId.toString() === userId);
    if (!member) throw new AppError({ code: 'BLISTER_ACCESS_FORBIDDEN', message: 'Blister membership is required.', statusCode: 403 });
    ensureWriterRole(member.role);
    const medicine = await getMedicineDocument(blisterId, input.medicineId, session);
    const treatment = await getTreatmentDocument(blisterId, input.treatmentId, session);
    if (!treatment.active || !blister.members.some((entry: { userId: Types.ObjectId }) => entry.userId.equals(treatment.patientUserId))) {
      throw new AppError({ code: 'TREATMENT_INACTIVE', message: 'The treatment or its patient is no longer active.', statusCode: 409 });
    }
    // Serialize taken AND skipped logs and concurrent treatment edits. Retried
    // transactions re-read the current schedule, stock and duplicate predicate.
    await TreatmentModel.updateOne({ _id: treatment._id }, { $inc: { __v: 1 } }, { session });
    const treatmentMedicine = getTreatmentMedicineEntry(treatment.medicines, input.medicineId);
    const treatmentAmount = treatmentMedicine.amount;
    const status = input.status ?? 'taken';
    const requestedAmount = status === 'skipped'
      ? 0
      : resolveRequestedAmount(input.amount, treatmentAmount);

    const requestedTimestamp = input.timestamp ?? new Date();
    const { effectiveTimestamp, toleranceMs } = resolveDoseAlignment(
      treatment,
      treatmentMedicine,
      requestedTimestamp,
    );

    const dedupeFrom = new Date(effectiveTimestamp.getTime() - toleranceMs);
    const dedupeTo = new Date(effectiveTimestamp.getTime() + toleranceMs);
    const existingLog = await AdherenceLogModel.findOne({
      blisterId: new Types.ObjectId(blisterId),
      treatmentId: new Types.ObjectId(input.treatmentId),
      medicineId: new Types.ObjectId(input.medicineId),
      timestamp: { $gte: dedupeFrom, $lte: dedupeTo },
    })
      .session(session)
      .sort({ timestamp: 1 })
      .lean();

    if (existingLog) {
      throw new AppError({
        code: 'ADHERENCE_LOG_DUPLICATE',
        message: 'This scheduled dose is already logged.',
        statusCode: HTTP_STATUS_CONFLICT,
        details: [
          `adherenceLogId=${(existingLog._id as Types.ObjectId).toString()}`,
          `status=${existingLog.status ?? 'taken'}`,
          `timestamp=${(existingLog.timestamp as Date).toISOString()}`,
        ],
      });
    }

    const remainingStock = medicine.stock - requestedAmount;
    if (status === 'taken' && remainingStock < 0 && !input.force) {
      throw new AppError({
        code: 'ADHERENCE_STOCK_INSUFFICIENT',
        message: 'Insufficient stock. Retry with force: true to confirm a forced log.',
        statusCode: HTTP_STATUS_UNPROCESSABLE_ENTITY,
      });
    }

    const isForced = status === 'taken' && remainingStock < 0;
    const deductedAmount = isForced ? medicine.stock : requestedAmount;
    if (status === 'taken') {
      medicine.stock = isForced ? 0 : remainingStock;
      await medicine.save({ session });
    }

    const [adherenceLog] = await AdherenceLogModel.create([{
      blisterId: new Types.ObjectId(blisterId),
      medicineId: new Types.ObjectId(input.medicineId),
      userId: new Types.ObjectId(userId),
      treatmentId: new Types.ObjectId(input.treatmentId),
      status,
      amount: requestedAmount,
      deductedAmount,
      patientUserId: treatment.patientUserId,
      stockUnit: medicine.stockUnit,
      occurrenceKey: `${blisterId}:${input.treatmentId}:${input.medicineId}:${effectiveTimestamp.toISOString()}`,
      isForced,
      notes: input.notes ?? null,
      timestamp: effectiveTimestamp,
    }], { session });
    return { adherenceLog, medicine, blister, status, isForced };
  });

  const { adherenceLog, medicine, blister, status, isForced } = committed;

  // Integrations run after commit and cannot turn a successful dose into an
  // apparent failed write. They must never be retried inside a transaction.
  try {
    if (status === 'taken' && medicine.stock <= medicine.threshold) {
      await notifyStockLow(medicine, blister);
    }

    if (isForced) {
      await notifyAdherenceForced(adherenceLog, medicine, blister);
    }
  } catch {
    console.error('Adherence committed; notification delivery failed.');
  }

  return toAdherenceLogView(adherenceLog);
};

/**
 * Deletes an adherence log created by the same author within the allowed undo window and restores stock.
 */
export const adherenceLogsDelete = async (
  blisterId: string,
  adherenceLogId: string,
  userId: string,
): Promise<void> => {
  await inTransaction(async (session) => {
    const adherenceLog = await getAdherenceLogDocument(blisterId, adherenceLogId, session);

    if (adherenceLog.userId.toString() !== userId) {
      throw new AppError({
        code: 'ADHERENCE_LOG_AUTHOR_FORBIDDEN',
        message: 'Only the author can undo this adherence log.',
        statusCode: HTTP_STATUS_FORBIDDEN,
      });
    }

    const undoReferenceTime = adherenceLog.createdAt ?? adherenceLog.timestamp;

    if (Date.now() - undoReferenceTime.getTime() > ADHERENCE_LOG_UNDO_WINDOW_MS) {
      throw new AppError({
        code: 'ADHERENCE_LOG_UNDO_WINDOW_EXPIRED',
        message: 'This adherence log can no longer be undone.',
        statusCode: HTTP_STATUS_UNPROCESSABLE_ENTITY,
      });
    }

    const medicine = await getMedicineDocument(blisterId, adherenceLog.medicineId.toString(), session);
    medicine.stock += adherenceLog.deductedAmount ?? adherenceLog.amount;

    await medicine.save({ session });
    await adherenceLog.deleteOne({ session });
  });
};
