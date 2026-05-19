import { Types } from 'mongoose';

import { AppointmentModel } from '../../models/appointment.model';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';
import { type BlisterMember, type BlisterRole } from '../../types/blister.types';
import { computeDosesInRange, computeScheduleToleranceMs } from '../../utils/dose-schedule';
import { formatTimeOfDayInTimeZone, getMedicationTimeZone } from '../../utils/time-zone';
import {
  type CalendarQuery,
  type UpcomingDosesQuery,
} from '../../../../shared/schemas';

export interface UpcomingDoseItem {
  doseAt: Date;
  displayTime: string | null;
  blisterId: string;
  blisterName: string;
  blisterAvatarKey: string | null;
  patientUserId: string;
  patientName: string;
  patientAvatarKey: string | null;
  treatmentId: string;
  treatmentTitle: string;
  medicineId: string;
  medicineName: string;
  amount: number;
  isTaken: boolean;
  isSkipped: boolean;
  takenAt: Date | null;
  skippedAt: Date | null;
  adherenceCreatedAt: Date | null;
  adherenceLogId: string | null;
  /** Rol del usuario autenticado en el blíster, para que el frontend decida si mostrar acciones de escritura. */
  callerRole: BlisterRole;
}

export interface CalendarAppointmentItem {
  id: string;
  blisterId: string;
  blisterName: string;
  blisterAvatarKey: string | null;
  patientUserId: string;
  patientName: string;
  treatmentId: string | null;
  title: string;
  date: Date;
  callerRole: BlisterRole;
}

export interface CalendarResult {
  appointments: CalendarAppointmentItem[];
  doses: UpcomingDoseItem[];
}

interface AccessibleBlisterContext {
  id: Types.ObjectId;
  name: string;
  avatarKey: string | null;
  role: BlisterRole;
}

const findAccessibleBlisters = async (
  userId: string,
  blisterIdFilter?: string,
): Promise<AccessibleBlisterContext[]> => {
  const filter: Record<string, unknown> = {
    deletedAt: null,
    members: { $elemMatch: { userId: new Types.ObjectId(userId) } },
  };

  if (blisterIdFilter) {
    filter._id = new Types.ObjectId(blisterIdFilter);
  }

  const blisters = await BlisterModel.find(filter).lean();

  return blisters
    .map((blister) => {
      const member = (blister.members as BlisterMember[]).find(
        (entry) => entry.userId.toString() === userId,
      );
      if (!member) {
        return null;
      }
      return {
        id: blister._id,
        name: blister.name,
        avatarKey: (blister.avatarKey as string | undefined) ?? null,
        role: member.role,
      };
    })
    .filter((value): value is AccessibleBlisterContext => value !== null);
};

interface PatientView {
  name: string;
  avatarKey: string | null;
}

const buildPatientMap = async (userIds: Types.ObjectId[]): Promise<Map<string, PatientView>> => {
  if (userIds.length === 0) {
    return new Map();
  }
  const users = await UserModel.find({ _id: { $in: userIds }, deletedAt: null })
    .select('name settings.avatarKey')
    .lean();
  return new Map(
    users.map((user) => [
      user._id.toString(),
      {
        name: user.name,
        avatarKey: (user.settings?.avatarKey as string | undefined) ?? null,
      },
    ]),
  );
};

/**
 * Devuelve las próximas tomas de todos los blísteres a los que pertenece el
 * usuario autenticado dentro del rango solicitado, agrupando información de
 * paciente, blíster y medicamento para que el frontend renderice una vista
 * unificada del Home o un calendario filtrado.
 */
export const meUpcomingDoses = async (
  userId: string,
  query: UpcomingDosesQuery,
): Promise<UpcomingDoseItem[]> => {
  const blisters = await findAccessibleBlisters(userId, query.blisterId);
  if (blisters.length === 0) {
    return [];
  }

  const blisterIds = blisters.map((blister) => blister.id);
  const [treatments, medicines] = await Promise.all([
    TreatmentModel.find({ blisterId: { $in: blisterIds }, active: true, deletedAt: null }).lean(),
    MedicineModel.find({ blisterId: { $in: blisterIds }, deletedAt: null }).lean(),
  ]);
  const treatmentIds = treatments.map((treatment) => treatment._id as Types.ObjectId);
  const adherenceLogWindowMs = 12 * 60 * 60 * 1000;
  const adherenceLogs = treatmentIds.length > 0
    ? await AdherenceLogModel.find({
        blisterId: { $in: blisterIds },
        treatmentId: { $in: treatmentIds },
        timestamp: {
          $gte: new Date(query.from.getTime() - adherenceLogWindowMs),
          $lte: new Date(query.to.getTime() + adherenceLogWindowMs),
        },
      }).lean()
    : [];

  const blisterById = new Map(blisters.map((blister) => [blister.id.toString(), blister]));
  const medicineById = new Map(
    medicines.map((medicine) => [
      medicine._id.toString(),
      (medicine.alias as string | undefined) ?? medicine.nombre,
    ]),
  );
  const patients = await buildPatientMap(
    treatments.map((treatment) => treatment.patientUserId as Types.ObjectId),
  );
  const adherenceLogsByGroup = new Map<string, typeof adherenceLogs>();
  for (const log of adherenceLogs) {
    const groupKey = [
      (log.treatmentId as Types.ObjectId).toString(),
      (log.medicineId as Types.ObjectId).toString(),
    ].join(':');
    const bucket = adherenceLogsByGroup.get(groupKey) ?? [];
    bucket.push(log);
    adherenceLogsByGroup.set(groupKey, bucket);
  }
  const consumedAdherenceLogIds = new Set<string>();

  const items: UpcomingDoseItem[] = [];
  for (const treatment of treatments) {
    const blister = blisterById.get((treatment.blisterId as Types.ObjectId).toString());
    if (!blister) continue;

    for (const entry of treatment.medicines) {
      const scheduleType = (entry.scheduleType as 'interval' | 'daily_times' | undefined) ?? 'interval';
      const timeZone = getMedicationTimeZone(treatment.timeZone as string | null | undefined);
      const source = {
        startDate: entry.firstDoseAt as Date,
        endDate: (treatment.endDate as Date | null | undefined) ?? null,
        active: Boolean(treatment.active),
        timeZone,
      };
      const scheduleEntry = {
        firstDoseAt: entry.firstDoseAt as Date,
        scheduleType,
        frequencyHours: (entry.frequencyHours as number | null | undefined) ?? null,
        dailyDoseTimes: (entry.dailyDoseTimes as string[] | undefined) ?? [],
        isRecurring: Boolean(entry.isRecurring),
      };
      const occurrences = computeDosesInRange(source, scheduleEntry, query.from, query.to);
      const toleranceMs = computeScheduleToleranceMs(scheduleEntry);
      const groupKey = [
        (treatment._id as Types.ObjectId).toString(),
        (entry.medicineId as Types.ObjectId).toString(),
      ].join(':');
      const groupLogs = adherenceLogsByGroup.get(groupKey) ?? [];

      for (const doseAt of occurrences) {
        let adherenceLog: (typeof groupLogs)[number] | undefined;
        let bestDelta = toleranceMs + 1;
        for (const log of groupLogs) {
          const logId = (log._id as Types.ObjectId).toString();
          if (consumedAdherenceLogIds.has(logId)) continue;
          const delta = Math.abs((log.timestamp as Date).getTime() - doseAt.getTime());
          if (delta <= toleranceMs && delta < bestDelta) {
            bestDelta = delta;
            adherenceLog = log;
          }
        }
        if (adherenceLog) {
          consumedAdherenceLogIds.add((adherenceLog._id as Types.ObjectId).toString());
        }
        if (adherenceLog && !query.includeTaken) continue;
        const adherenceStatus = adherenceLog ? (adherenceLog.status ?? 'taken') : null;

        items.push({
          doseAt,
          displayTime: scheduleType === 'daily_times' ? formatTimeOfDayInTimeZone(doseAt, timeZone) : null,
          blisterId: blister.id.toString(),
          blisterName: blister.name,
          blisterAvatarKey: blister.avatarKey,
          patientUserId: (treatment.patientUserId as Types.ObjectId).toString(),
          patientName:
            patients.get((treatment.patientUserId as Types.ObjectId).toString())?.name ?? '',
          patientAvatarKey:
            patients.get((treatment.patientUserId as Types.ObjectId).toString())?.avatarKey ?? null,
          treatmentId: (treatment._id as Types.ObjectId).toString(),
          treatmentTitle: treatment.title as string,
          medicineId: (entry.medicineId as Types.ObjectId).toString(),
          medicineName: medicineById.get((entry.medicineId as Types.ObjectId).toString()) ?? 'Medicamento',
          amount: entry.amount,
          isTaken: adherenceStatus === 'taken',
          isSkipped: adherenceStatus === 'skipped',
          takenAt: adherenceStatus === 'taken' ? (adherenceLog?.timestamp as Date) : null,
          skippedAt: adherenceStatus === 'skipped' ? (adherenceLog?.timestamp as Date) : null,
          adherenceCreatedAt: adherenceLog ? (adherenceLog.createdAt ?? adherenceLog.timestamp as Date) : null,
          adherenceLogId: adherenceLog ? (adherenceLog._id as Types.ObjectId).toString() : null,
          callerRole: blister.role,
        });
      }
    }
  }

  return items.sort((left, right) => left.doseAt.getTime() - right.doseAt.getTime());
};

/**
 * Devuelve el contenido del calendario (citas y/o tomas) para todos los
 * blísteres del usuario o uno concreto, dentro del rango solicitado.
 */
export const meCalendar = async (
  userId: string,
  query: CalendarQuery,
): Promise<CalendarResult> => {
  const blisters = await findAccessibleBlisters(userId, query.blisterId);
  if (blisters.length === 0) {
    return { appointments: [], doses: [] };
  }

  const blisterIds = blisters.map((blister) => blister.id);
  const blisterById = new Map(blisters.map((blister) => [blister.id.toString(), blister]));

  const wantsAppointments = query.kinds.includes('appointments');
  const wantsDoses = query.kinds.includes('doses');

  const appointmentsPromise = wantsAppointments
    ? AppointmentModel.find({
        blisterId: { $in: blisterIds },
        date: { $gte: query.from, $lte: query.to },
      })
        .sort({ date: 1 })
        .lean()
    : Promise.resolve([]);

  const dosesPromise = wantsDoses
    ? meUpcomingDoses(userId, { from: query.from, to: query.to, blisterId: query.blisterId, includeTaken: query.includeTaken })
    : Promise.resolve([] as UpcomingDoseItem[]);

  const [appointmentDocs, doses] = await Promise.all([appointmentsPromise, dosesPromise]);

  const patients = await buildPatientMap(
    appointmentDocs.map((appointment) => appointment.patientUserId as Types.ObjectId),
  );

  const appointments: CalendarAppointmentItem[] = appointmentDocs
    .map((appointment) => {
      const blister = blisterById.get((appointment.blisterId as Types.ObjectId).toString());
      if (!blister) {
        return null;
      }
      return {
        id: (appointment._id as Types.ObjectId).toString(),
        blisterId: blister.id.toString(),
        blisterName: blister.name,
        blisterAvatarKey: blister.avatarKey,
        patientUserId: (appointment.patientUserId as Types.ObjectId).toString(),
        patientName:
          patients.get((appointment.patientUserId as Types.ObjectId).toString())?.name ?? '',
        treatmentId: appointment.treatmentId
          ? (appointment.treatmentId as Types.ObjectId).toString()
          : null,
        title: appointment.title as string,
        date: appointment.date as Date,
        callerRole: blister.role,
      };
    })
    .filter((value): value is CalendarAppointmentItem => value !== null);

  return { appointments, doses };
};
