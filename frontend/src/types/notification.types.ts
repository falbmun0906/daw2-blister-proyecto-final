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

export const pushConfigSchema = z.object({
  enabled: z.boolean(),
  publicKey: z.string().min(1).nullable(),
});

export const pushSubscriptionViewSchema = z.object({
  id: z.string().min(1),
  endpoint: z.string().url(),
  expirationTime: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type NotificationView = z.infer<typeof notificationViewSchema>;
export type NotificationType = NotificationView['type'];
export type NotificationSeverity = NotificationView['severity'];
export type NotificationsListMeta = z.infer<typeof notificationsListMetaSchema>;
export type PushConfig = z.infer<typeof pushConfigSchema>;
export type PushSubscriptionView = z.infer<typeof pushSubscriptionViewSchema>;

export interface NotificationsListResult {
  notifications: NotificationView[];
  meta: NotificationsListMeta;
}
