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
    .min(1, 'Title is required.')
    .max(120, 'Title must be 120 characters or fewer.'),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required.')
    .max(500, 'Message must be 500 characters or fewer.'),
  metadata: notificationMetadataSchema,
  isRead: z.boolean().default(false),
});

export const notificationsListQuerySchema = collectionPaginationQuerySchema;

export const notificationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const expirationWarningLevelSchema = z.enum(expirationWarningLevels);

export type NotificationInput = z.infer<typeof notificationSchema>;
export type NotificationsListQuery = z.infer<typeof notificationsListQuerySchema>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
export type ExpirationWarningLevelInput = z.infer<typeof expirationWarningLevelSchema>;
