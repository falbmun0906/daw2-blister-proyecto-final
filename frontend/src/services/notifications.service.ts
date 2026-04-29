import { apiClient, normalizeApiResponse } from './api.client';
import {
  notificationViewSchema,
  notificationsListMetaSchema,
  type NotificationView,
  type NotificationsListResult,
} from '../types/notification.types';

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
