import { Types } from 'mongoose';

import { AppointmentModel } from '../../models/appointment.model';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';
import { type BlisterMember, type BlisterRole } from '../../types/blister.types';
import { computeDosesInRange } from '../../utils/dose-schedule';
import {
  type CalendarQuery,
  type UpcomingDosesQuery,
} from '../../../../shared/schemas';

export interface UpcomingDoseItem {
  doseAt: Date;
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
  const users = await UserModel.find({ _id: { $in: userIds } })
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
    TreatmentModel.find({ blisterId: { $in: blisterIds }, active: true }).lean(),
    MedicineModel.find({ blisterId: { $in: blisterIds } }).lean(),
  ]);
  const treatmentIds = treatments.map((treatment) => treatment._id as Types.ObjectId);
  const adherenceLogs = treatmentIds.length > 0
    ? await AdherenceLogModel.find({
        blisterId: { $in: blisterIds },
        treatmentId: { $in: treatmentIds },
        timestamp: { $gte: query.from, $lte: query.to },
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
  const adherenceLogByDoseKey = new Map(
    adherenceLogs.map((log) => [
      [
        (log.treatmentId as Types.ObjectId).toString(),
        (log.medicineId as Types.ObjectId).toString(),
        (log.timestamp as Date).getTime().toString(),
      ].join(':'),
      log,
    ]),
  );

  const items: UpcomingDoseItem[] = [];
  for (const treatment of treatments) {
    const blister = blisterById.get((treatment.blisterId as Types.ObjectId).toString());
    if (!blister) continue;

    for (const entry of treatment.medicines) {
      const source = {
        startDate: entry.firstDoseAt as Date,
        endDate: (treatment.endDate as Date | null | undefined) ?? null,
        active: Boolean(treatment.active),
      };
      const occurrences = computeDosesInRange(source, {
        firstDoseAt: entry.firstDoseAt as Date,
        scheduleType: (entry.scheduleType as 'interval' | 'daily_times' | undefined) ?? 'interval',
        frequencyHours: (entry.frequencyHours as number | null | undefined) ?? null,
        dailyDoseTimes: (entry.dailyDoseTimes as string[] | undefined) ?? [],
        isRecurring: Boolean(entry.isRecurring),
      }, query.from, query.to);

      for (const doseAt of occurrences) {
        const doseKey = [
          (treatment._id as Types.ObjectId).toString(),
          (entry.medicineId as Types.ObjectId).toString(),
          doseAt.getTime().toString(),
        ].join(':');
        const adherenceLog = adherenceLogByDoseKey.get(doseKey);
        if (adherenceLog && !query.includeTaken) continue;
        const adherenceStatus = adherenceLog ? (adherenceLog.status ?? 'taken') : null;

        items.push({
          doseAt,
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
