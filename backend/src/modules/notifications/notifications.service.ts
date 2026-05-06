import { Types } from 'mongoose';

import {
  APPOINTMENT_REMINDER_FOLLOW_UP_DELAY_MS,
  APPOINTMENT_REMINDER_FOLLOW_UP_LOOKBACK_MS,
  APPOINTMENT_REMINDER_LOOKAHEAD_HOURS,
  NOTIFICATION_DEDUPLICATION_WINDOW_MS,
} from '../../constants/domain.constants';
import { HTTP_STATUS_NOT_FOUND } from '../../constants/http.constants';
import { NotificationModel } from '../../models/notification.model';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { UserModel } from '../../models/user.model';
import { type AdherenceLogDocument } from '../../types/adherence-log.types';
import {
  type BlisterDocument,
  type BlisterRole,
} from '../../types/blister.types';
import { type MedicineDocument } from '../../types/medicine.types';
import {
  type ExpirationWarningLevel,
  type NotificationDocument,
  type NotificationMetadata,
  type NotificationSeverity,
  type NotificationType,
} from '../../types/notification.types';
import { type AppointmentDocument } from '../../types/appointment.types';
import { type UserSettings } from '../../types/user.types';
import { AppError } from '../../utils/app-error';
import { type NotificationsListQuery } from '../../../../shared/schemas';
import { type CimaChangeLogDocument } from '../../types/cima-change-log.types';
import { sendPushForNotifications } from './notifications-push.service';

type PersistedNotification = NonNullable<Awaited<ReturnType<typeof NotificationModel.findOne>>>;

interface NotificationView {
  id: string;
  userId: string;
  blisterId: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata: NotificationMetadata | null;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationsListResult {
  notifications: NotificationView[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DomainNotificationInput {
  userId: Types.ObjectId;
  blisterId?: Types.ObjectId | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: NotificationMetadata | null;
}

const STOCK_ALERT_ROLES: BlisterRole[] = ['OWNER', 'CAREGIVER'];
const EXPIRATION_LEVEL_DAYS: Record<ExpirationWarningLevel, number> = {
  '30d': 30,
  '15d': 15,
  '7d': 7,
};
const HOUR_MS = 60 * 60 * 1000;

type AppointmentReminderPhase = 'before' | 'after';

const toNotificationView = (
  notification: PersistedNotification,
): NotificationView => ({
  id: notification._id.toString(),
  userId: notification.userId.toString(),
  blisterId: notification.blisterId?.toString() ?? null,
  type: notification.type,
  severity: notification.severity,
  title: notification.title,
  message: notification.message,
  metadata: notification.metadata ?? null,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

const getRecipientIdsByRoles = (
  blister: BlisterDocument,
  allowedRoles: readonly BlisterRole[],
): Types.ObjectId[] =>
  blister.members
    .filter((member) => allowedRoles.includes(member.role))
    .map((member) => member.userId);

const getAllRecipientIds = (blister: BlisterDocument): Types.ObjectId[] =>
  blister.members.map((member) => member.userId);

const createNotifications = async (
  notifications: DomainNotificationInput[],
): Promise<void> => {
  if (notifications.length === 0) {
    return;
  }

  const createdNotifications = await NotificationModel.insertMany(notifications);
  await sendPushForNotifications(createdNotifications);
};

const hasRecentUnreadNotification = async ({
  blisterId,
  userId,
  type,
  metadataFilters,
}: {
  blisterId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  metadataFilters: Record<string, string>;
}): Promise<boolean> => {
  const createdAt = new Date(Date.now() - NOTIFICATION_DEDUPLICATION_WINDOW_MS);
  const existingNotification = await NotificationModel.exists({
    blisterId,
    userId,
    type,
    isRead: false,
    createdAt: {
      $gte: createdAt,
    },
    ...Object.fromEntries(
      Object.entries(metadataFilters).map(([key, value]) => [`metadata.${key}`, value]),
    ),
  });

  return existingNotification !== null;
};

const buildStockLowNotification = (
  userId: Types.ObjectId,
  medicine: MedicineDocument,
): DomainNotificationInput => ({
  userId,
  blisterId: medicine.blisterId,
  type: 'stock_low',
  severity: 'warning',
  title: 'Stock bajo',
  message: `El medicamento ${medicine.nombre} ha alcanzado el umbral minimo de stock.`,
  metadata: {
    medicineId: medicine._id.toString(),
    threshold: medicine.threshold,
    currentStock: medicine.stock,
    stockUnit: medicine.stockUnit,
  },
});

const buildStockDepletedNotification = (
  userId: Types.ObjectId,
  medicine: MedicineDocument,
): DomainNotificationInput => ({
  userId,
  blisterId: medicine.blisterId,
  type: 'stock_depleted',
  severity: 'critical',
  title: 'Stock agotado',
  message: `El medicamento ${medicine.nombre} se ha quedado sin stock.`,
  metadata: {
    medicineId: medicine._id.toString(),
    threshold: medicine.threshold,
    currentStock: medicine.stock,
    stockUnit: medicine.stockUnit,
  },
});

const buildExpirationWarningNotification = (
  userId: Types.ObjectId,
  medicine: MedicineDocument,
  level: ExpirationWarningLevel,
): DomainNotificationInput => ({
  userId,
  blisterId: medicine.blisterId,
  type: 'expiration_warning',
  severity: level === '7d' ? 'critical' : 'warning',
  title: 'Caducidad proxima',
  message: `El medicamento ${medicine.nombre} caduca en ${EXPIRATION_LEVEL_DAYS[level]} dias.`,
  metadata: {
    medicineId: medicine._id.toString(),
    expDate: medicine.expDate.toISOString(),
    level,
  },
});

const buildForcedAdherenceNotification = (
  userId: Types.ObjectId,
  adherenceLog: AdherenceLogDocument,
  medicine: MedicineDocument,
): DomainNotificationInput => ({
  userId,
  blisterId: medicine.blisterId,
  type: 'adherence_forced',
  severity: 'critical',
  title: 'Toma registrada en modo forzado',
  message: `Se ha registrado una toma forzada de ${medicine.nombre} por inconsistencia de stock.`,
  metadata: {
    logId: adherenceLog._id.toString(),
    medicineId: medicine._id.toString(),
    treatmentId: adherenceLog.treatmentId.toString(),
    recordedAmount: adherenceLog.amount,
    remainingStock: medicine.stock,
    notes: adherenceLog.notes ?? null,
  },
});

const getAppointmentReminderHours = (settings: UserSettings): number => {
  switch (settings.notifications.appointmentReminderPreset) {
    case '12h':
      return 12;
    case '1d':
      return 24;
    case 'custom':
      return settings.notifications.customAppointmentReminderHours;
    case '3h':
    default:
      return 3;
  }
};

const buildAppointmentReminderKey = (
  appointment: AppointmentDocument,
  userId: Types.ObjectId,
  phase: AppointmentReminderPhase,
  targetAt: Date,
): string =>
  [
    appointment._id.toString(),
    userId.toString(),
    phase,
    targetAt.toISOString(),
  ].join(':');

const buildAppointmentReminderNotification = ({
  userId,
  appointment,
  phase,
  targetAt,
  reminderHours,
}: {
  userId: Types.ObjectId;
  appointment: AppointmentDocument;
  phase: AppointmentReminderPhase;
  targetAt: Date;
  reminderHours: number;
}): DomainNotificationInput => ({
  userId,
  blisterId: appointment.blisterId,
  type: 'appointment_reminder',
  severity: 'info',
  title: phase === 'before' ? 'Cita medica proxima' : 'Tras la cita',
  message: phase === 'before'
    ? `Tienes ${appointment.title} dentro de ${reminderHours} h.`
    : appointment.treatmentId
      ? 'Tras la cita, revisa si hay cambios que aplicar al tratamiento.'
      : 'Tras la cita, revisa si hay algun cambio que anotar.',
  metadata: {
    appointmentId: appointment._id.toString(),
    treatmentId: appointment.treatmentId?.toString() ?? null,
    appointmentDate: appointment.date.toISOString(),
    reminderPhase: phase,
    reminderAt: targetAt.toISOString(),
    reminderHours,
    reminderKey: buildAppointmentReminderKey(appointment, userId, phase, targetAt),
  },
});

/**
 * Lists inbox notifications for the authenticated user with standard pagination metadata.
 */
export const notificationsList = async (
  userId: string,
  query: NotificationsListQuery,
): Promise<NotificationsListResult> => {
  const { page, limit } = query;
  const filter = {
    userId: new Types.ObjectId(userId),
  };
  const [notifications, total] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    NotificationModel.countDocuments(filter),
  ]);

  return {
    notifications: notifications.map((notification) => toNotificationView(notification)),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

/**
 * Marks a single notification as read if it belongs to the authenticated user.
 */
export const notificationsMarkAsRead = async (
  notificationId: string,
  userId: string,
): Promise<NotificationView> => {
  const notification = await NotificationModel.findOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  });

  if (!notification) {
    throw new AppError({
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }

  notification.isRead = true;
  await notification.save();

  return toNotificationView(notification);
};

/**
 * Deletes a single notification if it belongs to the authenticated user.
 */
export const notificationsDelete = async (
  notificationId: string,
  userId: string,
): Promise<void> => {
  const result = await NotificationModel.deleteOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  });

  if (result.deletedCount === 0) {
    throw new AppError({
      code: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification not found.',
      statusCode: HTTP_STATUS_NOT_FOUND,
    });
  }
};

/**
 * Creates low-stock notifications for OWNER and CAREGIVER members when a medicine reaches its threshold.
 */
export const notifyStockLow = async (
  medicine: MedicineDocument,
  blister: BlisterDocument,
): Promise<void> => {
  if (medicine.stock > medicine.threshold) {
    return;
  }

  const recipientIds = getRecipientIdsByRoles(blister, STOCK_ALERT_ROLES);
  const notificationType = medicine.stock === 0 ? 'stock_depleted' : 'stock_low';
  const duplicateChecks = await Promise.all(
    recipientIds.map(async (userId) => ({
      userId,
      exists: await hasRecentUnreadNotification({
        blisterId: blister._id,
        userId,
        type: notificationType,
        metadataFilters: {
          medicineId: medicine._id.toString(),
        },
      }),
    })),
  );

  await createNotifications(
    duplicateChecks
      .filter((check) => !check.exists)
      .map((check) =>
        notificationType === 'stock_depleted'
          ? buildStockDepletedNotification(check.userId, medicine)
          : buildStockLowNotification(check.userId, medicine),
      ),
  );
};

/**
 * Creates expiration warning notifications for every blister member for the requested warning level.
 */
export const notifyExpirationWarning = async (
  medicine: MedicineDocument,
  blister: BlisterDocument,
  level: ExpirationWarningLevel,
): Promise<void> => {
  const recipientIds = getAllRecipientIds(blister);
  const duplicateChecks = await Promise.all(
    recipientIds.map(async (userId) => ({
      userId,
      exists: await hasRecentUnreadNotification({
        blisterId: blister._id,
        userId,
        type: 'expiration_warning',
        metadataFilters: {
          medicineId: medicine._id.toString(),
          level,
        },
      }),
    })),
  );

  await createNotifications(
    duplicateChecks
      .filter((check) => !check.exists)
      .map((check) => buildExpirationWarningNotification(check.userId, medicine, level)),
  );
};

/**
 * Creates forced-adherence notifications for OWNER and CAREGIVER members of the blister.
 */
export const notifyAdherenceForced = async (
  adherenceLog: AdherenceLogDocument,
  medicine: MedicineDocument,
  blister: BlisterDocument,
): Promise<void> => {
  const recipientIds = getRecipientIdsByRoles(blister, STOCK_ALERT_ROLES);

  await createNotifications(
    recipientIds.map((userId) =>
      buildForcedAdherenceNotification(userId, adherenceLog, medicine),
    ),
  );
};

const getCimaChangeSeverity = (cambios: string[]): NotificationSeverity => {
  if (cambios.includes('notasSeguridad') || cambios.includes('psum')) {
    return 'critical';
  }

  if (cambios.includes('estado') || cambios.includes('comerc')) {
    return 'warning';
  }

  return 'info';
};

const getCimaChangeTitle = (cambios: string[]): string => {
  if (cambios.includes('notasSeguridad')) {
    return 'Nueva nota de seguridad en CIMA';
  }

  if (cambios.includes('psum')) {
    return 'Nuevo problema de suministro en CIMA';
  }

  if (cambios.includes('estado')) {
    return 'Cambio en el estado de autorizacion';
  }

  if (cambios.includes('comerc')) {
    return 'Cambio en la comercializacion';
  }

  if (cambios.includes('ft')) {
    return 'Actualizacion de ficha tecnica';
  }

  return 'Actualizacion de prospecto';
};

/**
 * Creates user-facing notifications for relevant CIMA changes affecting a medicine.
 */
export const notifyCimaChange = async (
  medicine: MedicineDocument,
  blister: BlisterDocument,
  changeLog: CimaChangeLogDocument,
): Promise<void> => {
  const recipientIds = getRecipientIdsByRoles(blister, STOCK_ALERT_ROLES);
  const changeSignature = [
    changeLog.tipoCambio,
    changeLog.fechaCambio.toISOString(),
    ...changeLog.cambios,
  ].join('|');
  const duplicateChecks = await Promise.all(
    recipientIds.map(async (userId) => ({
      userId,
      exists: await hasRecentUnreadNotification({
        blisterId: blister._id,
        userId,
        type: 'cima_change',
        metadataFilters: {
          medicineId: medicine._id.toString(),
          changeSignature,
        },
      }),
    })),
  );

  const severity = getCimaChangeSeverity(changeLog.cambios);
  const title = getCimaChangeTitle(changeLog.cambios);
  const message = `${medicine.nombre} ha recibido un cambio relevante en CIMA: ${changeLog.cambios.join(', ')}.`;

  await createNotifications(
    duplicateChecks
      .filter((check) => !check.exists)
      .map((check) => ({
        userId: check.userId,
        blisterId: medicine.blisterId,
        type: 'cima_change' as const,
        severity,
        title,
        message,
        metadata: {
          medicineId: medicine._id.toString(),
          changeLogId: changeLog._id.toString(),
          nregist: changeLog.nregist,
          cambios: changeLog.cambios,
          changeSignature,
        },
      })),
  );
};

/**
 * Scans upcoming and recently finished appointments and creates reminder notifications once per user.
 */
export const notifyUpcomingAppointmentReminders = async (
  referenceDate = new Date(),
): Promise<void> => {
  const from = new Date(referenceDate.getTime() - APPOINTMENT_REMINDER_FOLLOW_UP_LOOKBACK_MS);
  const to = new Date(referenceDate.getTime() + APPOINTMENT_REMINDER_LOOKAHEAD_HOURS * HOUR_MS);
  const appointments = await AppointmentModel.find({
    date: { $gte: from, $lte: to },
  });

  if (appointments.length === 0) {
    return;
  }

  const blisterIds = [...new Set(appointments.map((appointment) => appointment.blisterId.toString()))];
  const blisters = await BlisterModel.find({
    _id: { $in: blisterIds.map((id) => new Types.ObjectId(id)) },
    deletedAt: null,
  });
  const blisterById = new Map(blisters.map((blister) => [blister._id.toString(), blister]));
  const recipientIds = [
    ...new Set(
      blisters.flatMap((blister) =>
        (blister.members as BlisterDocument['members']).map((member) => member.userId.toString()),
      ),
    ),
  ];
  const users = await UserModel.find({
    _id: { $in: recipientIds.map((id) => new Types.ObjectId(id)) },
    deletedAt: null,
  }).select('settings');
  const settingsByUserId = new Map(
    users.map((user) => [user._id.toString(), user.settings as UserSettings]),
  );
  const candidates: Array<{ key: string; input: DomainNotificationInput }> = [];

  for (const appointment of appointments) {
    const blister = blisterById.get(appointment.blisterId.toString());
    if (!blister) continue;

    for (const member of blister.members) {
      const settings = settingsByUserId.get(member.userId.toString());
      if (!settings?.notifications.appointments) continue;

      const reminderHours = getAppointmentReminderHours(settings);
      const beforeAt = new Date(appointment.date.getTime() - reminderHours * HOUR_MS);
      const followUpAt = new Date(appointment.date.getTime() + APPOINTMENT_REMINDER_FOLLOW_UP_DELAY_MS);
      const phases: Array<{ phase: AppointmentReminderPhase; targetAt: Date }> = [];

      if (beforeAt <= referenceDate && appointment.date > referenceDate) {
        phases.push({ phase: 'before', targetAt: beforeAt });
      }

      if (followUpAt <= referenceDate && appointment.date >= from) {
        phases.push({ phase: 'after', targetAt: followUpAt });
      }

      for (const { phase, targetAt } of phases) {
        const key = buildAppointmentReminderKey(appointment, member.userId, phase, targetAt);
        candidates.push({
          key,
          input: buildAppointmentReminderNotification({
            userId: member.userId,
            appointment,
            phase,
            targetAt,
            reminderHours,
          }),
        });
      }
    }
  }

  if (candidates.length === 0) {
    return;
  }

  const existing = await NotificationModel.find({
    type: 'appointment_reminder',
    'metadata.reminderKey': { $in: candidates.map((candidate) => candidate.key) },
  }).select('metadata.reminderKey');
  const existingKeys = new Set(
    existing
      .map((notification) => notification.metadata?.reminderKey)
      .filter((key): key is string => typeof key === 'string'),
  );

  await createNotifications(
    candidates
      .filter((candidate) => !existingKeys.has(candidate.key))
      .map((candidate) => candidate.input),
  );
};

/**
 * Evaluates a medicine collection and emits expiration warnings for 30, 15 or 7 day thresholds.
 */
export const notifyExpirationWarningsForMedicines = async (
  medicines: MedicineDocument[],
  blister: BlisterDocument,
  referenceDate = new Date(),
): Promise<void> => {
  const currentDay = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );

  for (const medicine of medicines) {
    const expirationDay = Date.UTC(
      medicine.expDate.getUTCFullYear(),
      medicine.expDate.getUTCMonth(),
      medicine.expDate.getUTCDate(),
    );
    const daysUntilExpiration = Math.ceil((expirationDay - currentDay) / (24 * 60 * 60 * 1000));
    const level = (Object.entries(EXPIRATION_LEVEL_DAYS).find(
      ([, days]) => days === daysUntilExpiration,
    )?.[0] ?? null) as ExpirationWarningLevel | null;

    if (level) {
      await notifyExpirationWarning(medicine, blister, level);
    }
  }
};
