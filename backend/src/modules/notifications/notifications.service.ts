import { Types } from 'mongoose';

import { NOTIFICATION_DEDUPLICATION_WINDOW_MS } from '../../constants/domain.constants';
import { HTTP_STATUS_NOT_FOUND } from '../../constants/http.constants';
import { NotificationModel } from '../../models/notification.model';
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
import { AppError } from '../../utils/app-error';
import { type NotificationsListQuery } from '../../../../shared/schemas';

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

const toNotificationView = (
  notification: NotificationDocument,
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

  await NotificationModel.insertMany(notifications);
};

const hasRecentUnreadNotification = async ({
  blisterId,
  userId,
  type,
  medicineId,
  level,
}: {
  blisterId: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  medicineId: string;
  level?: ExpirationWarningLevel;
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
    'metadata.medicineId': medicineId,
    ...(level ? { 'metadata.level': level } : {}),
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
  severity: medicine.stock === 0 ? 'critical' : 'warning',
  title: medicine.stock === 0 ? 'Stock agotado' : 'Stock bajo',
  message:
    medicine.stock === 0
      ? `El medicamento ${medicine.nombre} se ha quedado sin stock.`
      : `El medicamento ${medicine.nombre} ha alcanzado el umbral minimo de stock.`,
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
  const duplicateChecks = await Promise.all(
    recipientIds.map(async (userId) => ({
      userId,
      exists: await hasRecentUnreadNotification({
        blisterId: blister._id,
        userId,
        type: 'stock_low',
        medicineId: medicine._id.toString(),
      }),
    })),
  );

  await createNotifications(
    duplicateChecks
      .filter((check) => !check.exists)
      .map((check) => buildStockLowNotification(check.userId, medicine)),
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
        medicineId: medicine._id.toString(),
        level,
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
