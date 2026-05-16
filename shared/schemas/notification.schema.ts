import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  objectIdSchema,
} from './common.schema';
import {
  expirationWarningLevels,
  notificationSeverities,
  notificationTypes,
} from './schema.constants';

export const notificationMetadataSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional();

export const notificationSchema = z.object({
  type: z.enum(notificationTypes),
  severity: z.enum(notificationSeverities),
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio.')
    .max(120, 'El título no puede superar los 120 caracteres.'),
  message: z
    .string()
    .trim()
    .min(1, 'El mensaje es obligatorio.')
    .max(500, 'El mensaje no puede superar los 500 caracteres.'),
  metadata: notificationMetadataSchema,
  isRead: z.boolean().default(false),
});

export const notificationsListQuerySchema = collectionPaginationQuerySchema;

export const notificationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().trim().min(1, 'La clave p256dh es obligatoria.'),
  auth: z.string().trim().min(1, 'La clave auth es obligatoria.'),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url('El endpoint debe ser una URL válida.'),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: pushSubscriptionKeysSchema,
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string().trim().url('El endpoint debe ser una URL válida.'),
});

export const expirationWarningLevelSchema = z.enum(expirationWarningLevels);

export type NotificationInput = z.infer<typeof notificationSchema>;
export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
export type ExpirationWarningLevelInput = z.infer<typeof expirationWarningLevelSchema>;
