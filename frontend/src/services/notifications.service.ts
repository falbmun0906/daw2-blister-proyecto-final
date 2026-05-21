import { apiClient, normalizeApiResponse } from './api.client';
import { z } from 'zod';
import {
  notificationViewSchema,
  notificationsListMetaSchema,
  pushConfigSchema,
  pushSubscriptionViewSchema,
  type NotificationView,
  type NotificationsListResult,
  type PushConfig,
  type PushSubscriptionView,
} from '../types/notification.types';
import type {
  DeletePushSubscriptionInput,
  PushSubscriptionInput,
} from '../../../shared/schemas';

interface ListNotificationsRawResponse {
  data: unknown[];
  meta?: unknown;
}

/** GET /notifications con paginación. Devuelve lista + metadatos de paginación. */
export async function listNotifications(
  page = 1,
  limit = 20,
): Promise<NotificationsListResult> {
  const response = await apiClient.get('/notifications', {
    params: { page, limit },
  });
  const envelope = response.data as ListNotificationsRawResponse;
  const items = Array.isArray(envelope.data) ? envelope.data : [];
  const notifications = items.map((item) => notificationViewSchema.parse(item));
  const meta = envelope.meta
    ? notificationsListMetaSchema.parse(envelope.meta)
    : { page, limit, total: notifications.length, totalPages: 1 };
  return { notifications, meta };
}

/** PATCH /notifications/:id/read. Devuelve la notificación marcada como leída. */
export async function markNotificationAsRead(
  notificationId: string,
): Promise<NotificationView> {
  const response = await apiClient.patch(`/notifications/${notificationId}/read`);
  return notificationViewSchema.parse(normalizeApiResponse(response));
}

/** DELETE /notifications/:id. Elimina una notificación del buzón. */
export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/notifications/${notificationId}`);
}

/** GET /notifications/push/config. Devuelve disponibilidad y clave publica VAPID. */
export async function getPushConfig(): Promise<PushConfig> {
  const response = await apiClient.get('/notifications/push/config');
  return pushConfigSchema.parse(normalizeApiResponse(response));
}

/** GET /notifications/push/subscriptions. Lista dispositivos suscritos del usuario. */
export async function listPushSubscriptions(): Promise<PushSubscriptionView[]> {
  const response = await apiClient.get('/notifications/push/subscriptions');
  const data = normalizeApiResponse(response);
  return z.array(pushSubscriptionViewSchema).parse(data);
}

/** POST /notifications/push/subscriptions. Registra la suscripcion Web Push actual. */
export async function savePushSubscription(
  input: PushSubscriptionInput,
): Promise<PushSubscriptionView> {
  const response = await apiClient.post('/notifications/push/subscriptions', input);
  return pushSubscriptionViewSchema.parse(normalizeApiResponse(response));
}

/** DELETE /notifications/push/subscriptions. Da de baja la suscripcion Web Push actual. */
export async function deletePushSubscription(
  input: DeletePushSubscriptionInput,
): Promise<void> {
  await apiClient.delete('/notifications/push/subscriptions', { data: input });
}
