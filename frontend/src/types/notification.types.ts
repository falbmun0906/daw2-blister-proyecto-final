import { z } from 'zod';

import {
  notificationSeverities,
  notificationTypes,
} from '../../../shared/schemas/schema.constants';

/**
 * Schema validador de la respuesta del backend para una notificación.
 * El backend serializa `_id` como `id` y `createdAt` como string ISO.
 */
export const notificationViewSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  blisterId: z.string().min(1).nullable(),
  type: z.enum(notificationTypes),
  severity: z.enum(notificationSeverities),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

export const notificationsListMetaSchema = z.object({
  page: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type NotificationView = z.infer<typeof notificationViewSchema>;
export type NotificationType = NotificationView['type'];
export type NotificationSeverity = NotificationView['severity'];
export type NotificationsListMeta = z.infer<typeof notificationsListMetaSchema>;

export interface NotificationsListResult {
  notifications: NotificationView[];
  meta: NotificationsListMeta;
}
