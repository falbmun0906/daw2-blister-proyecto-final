import webPush from 'web-push';
import { Types } from 'mongoose';

import { env } from '../../config/env';
import {
  PUSH_NOTIFICATION_TTL_SECONDS,
  PUSH_NOTIFICATION_URGENCY,
} from '../../constants/domain.constants';
import {
  HTTP_STATUS_SERVICE_UNAVAILABLE,
} from '../../constants/http.constants';
import { PushSubscriptionModel } from '../../models/pushSubscription.model';
import { UserModel } from '../../models/user.model';
import { type NotificationDocument, type NotificationType } from '../../types/notification.types';
import { type PushSubscriptionDocument } from '../../types/push-subscription.types';
import { type UserSettings } from '../../types/user.types';
import { AppError } from '../../utils/app-error';
import {
  type DeletePushSubscriptionInput,
  type PushSubscriptionInput,
} from '../../../../shared/schemas';

interface PushConfigView {
  enabled: boolean;
  publicKey: string | null;
}

interface PushSubscriptionView {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PushPayload {
  notificationId: string;
  title: string;
  body: string;
  url: string;
  type: NotificationType;
  severity: string;
  createdAt: string;
}

const isWebPushConfigured = Boolean(
  env.webPushVapidPublicKey && env.webPushVapidPrivateKey,
);

if (isWebPushConfigured) {
  webPush.setVapidDetails(
    env.webPushVapidSubject,
    env.webPushVapidPublicKey as string,
    env.webPushVapidPrivateKey as string,
  );
}

const toPushSubscriptionView = (
  subscription: PushSubscriptionDocument,
): PushSubscriptionView => ({
  id: subscription._id.toString(),
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime ?? null,
  createdAt: subscription.createdAt,
  updatedAt: subscription.updatedAt,
});

const ensureWebPushConfigured = (): void => {
  if (!isWebPushConfigured) {
    throw new AppError({
      code: 'PUSH_NOT_CONFIGURED',
      message: 'Web Push VAPID keys are not configured.',
      statusCode: HTTP_STATUS_SERVICE_UNAVAILABLE,
    });
  }
};

const allowsPushForType = (
  type: NotificationType,
  settings: UserSettings,
): boolean => {
  if (!settings.notifications.pushEnabled) {
    return false;
  }

  switch (type) {
    case 'stock_low':
    case 'stock_depleted':
      return settings.notifications.stock;
    case 'expiration_warning':
      return settings.notifications.expiration;
    case 'cima_change':
      return settings.notifications.cima;
    case 'adherence_forced':
      return settings.notifications.adherence;
    case 'dose_reminder':
      return settings.notifications.doses !== false;
    case 'appointment_reminder':
      return settings.notifications.appointments;
    case 'system':
      return true;
  }
};

const getStringMetadata = (
  notification: NotificationDocument,
  key: string,
): string | null => {
  const value = notification.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const getNotificationTargetUrl = (notification: NotificationDocument): string => {
  const blisterId = notification.blisterId?.toString() ?? null;
  const medicineId = getStringMetadata(notification, 'medicineId');

  if (
    (notification.type === 'stock_low' ||
      notification.type === 'stock_depleted' ||
      notification.type === 'expiration_warning') &&
    blisterId &&
    medicineId
  ) {
    return `/blisters/${blisterId}/medicines/${medicineId}/edit`;
  }

  if (notification.type === 'cima_change') {
    const nregist = getStringMetadata(notification, 'nregist');
    if (nregist) return `/medicines/cima/${nregist}`;
    if (blisterId && medicineId) return `/blisters/${blisterId}/medicines/${medicineId}`;
  }

  if (notification.type === 'adherence_forced' && blisterId) {
    return `/blisters/${blisterId}/logs`;
  }

  if (notification.type === 'appointment_reminder' && blisterId) {
    return `/blisters/${blisterId}/appointments`;
  }

  if (notification.type === 'dose_reminder' && blisterId) {
    const treatmentId = getStringMetadata(notification, 'treatmentId');
    if (treatmentId) return `/blisters/${blisterId}/treatments/${treatmentId}`;
  }

  return '/notifications';
};

const buildPushPayload = (notification: NotificationDocument): PushPayload => ({
  notificationId: notification._id.toString(),
  title: notification.title,
  body: notification.message,
  url: getNotificationTargetUrl(notification),
  type: notification.type,
  severity: notification.severity,
  createdAt: notification.createdAt.toISOString(),
});

const isExpiredSubscriptionError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) {
    return false;
  }
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
};

/**
 * Returns the public Web Push configuration needed by authenticated clients.
 */
export const notificationsPushConfig = (): PushConfigView => ({
  enabled: isWebPushConfigured,
  publicKey: env.webPushVapidPublicKey ?? null,
});

/**
 * Lists registered push subscriptions for the authenticated user.
 */
export const notificationsPushSubscriptionsList = async (
  userId: string,
): Promise<PushSubscriptionView[]> => {
  const subscriptions = await PushSubscriptionModel.find({
    userId: new Types.ObjectId(userId),
  }).sort({ updatedAt: -1 });

  return subscriptions.map((subscription) => toPushSubscriptionView(subscription));
};

/**
 * Creates or refreshes a Web Push subscription for the authenticated user.
 */
export const notificationsPushSubscribe = async (
  userId: string,
  input: PushSubscriptionInput,
  userAgent?: string,
): Promise<PushSubscriptionView> => {
  ensureWebPushConfigured();

  const now = new Date();
  const subscription = await PushSubscriptionModel.findOneAndUpdate(
    { endpoint: input.endpoint },
    {
      $set: {
        userId: new Types.ObjectId(userId),
        endpoint: input.endpoint,
        expirationTime: input.expirationTime ?? null,
        keys: input.keys,
        userAgent: userAgent ?? null,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  return toPushSubscriptionView(subscription);
};

/**
 * Removes a Web Push subscription owned by the authenticated user.
 */
export const notificationsPushUnsubscribe = async (
  userId: string,
  input: DeletePushSubscriptionInput,
): Promise<void> => {
  await PushSubscriptionModel.deleteOne({
    endpoint: input.endpoint,
    userId: new Types.ObjectId(userId),
  });
};

/**
 * Sends Web Push payloads for freshly persisted notifications without failing the domain event.
 */
export const sendPushForNotifications = async (
  notifications: NotificationDocument[],
): Promise<void> => {
  if (!isWebPushConfigured || notifications.length === 0) {
    return;
  }

  const userIds = [...new Set(notifications.map((item) => item.userId.toString()))];
  const [subscriptions, users] = await Promise.all([
    PushSubscriptionModel.find({
      userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    }),
    UserModel.find({
      _id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      deletedAt: null,
    }).select('settings'),
  ]);
  const subscriptionsByUserId = new Map<string, PushSubscriptionDocument[]>();
  for (const subscription of subscriptions) {
    const key = subscription.userId.toString();
    subscriptionsByUserId.set(key, [...(subscriptionsByUserId.get(key) ?? []), subscription]);
  }
  const settingsByUserId = new Map(
    users.map((user) => [user._id.toString(), user.settings as UserSettings]),
  );

  await Promise.all(
    notifications.flatMap((notification) => {
      const settings = settingsByUserId.get(notification.userId.toString());
      if (!settings || !allowsPushForType(notification.type, settings)) {
        return [];
      }

      const payload = JSON.stringify(buildPushPayload(notification));
      return (subscriptionsByUserId.get(notification.userId.toString()) ?? []).map(
        async (subscription) => {
          try {
            await webPush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
              },
              payload,
              {
                TTL: PUSH_NOTIFICATION_TTL_SECONDS,
                urgency: PUSH_NOTIFICATION_URGENCY,
              },
            );
            await PushSubscriptionModel.updateOne(
              { _id: subscription._id },
              { $set: { lastUsedAt: new Date() } },
            );
          } catch (error) {
            if (isExpiredSubscriptionError(error)) {
              await PushSubscriptionModel.deleteOne({ _id: subscription._id });
              return;
            }

            console.error('Failed to send Web Push notification.', error);
          }
        },
      );
    }),
  );

};
