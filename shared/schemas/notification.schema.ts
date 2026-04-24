import { z } from 'zod';

import {
  cimaNotificationTypes,
  notificationCategories,
} from './schema.constants';

export const notificationSchema = z.object({
  category: z.enum(notificationCategories),
  cimaType: z.enum(cimaNotificationTypes).optional(),
  message: z
    .string()
    .trim()
    .min(1, 'Message is required.')
    .max(500, 'Message must be 500 characters or fewer.'),
  isRead: z.boolean().default(false),
});

export type NotificationInput = z.infer<typeof notificationSchema>;
