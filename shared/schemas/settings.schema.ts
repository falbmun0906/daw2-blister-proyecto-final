import { z } from 'zod';

import {
  fontOptions,
  fontSizeOptions,
  themeOptions,
} from './schema.constants';

export const notificationSettingsSchema = z.object({
  pushEnabled: z.boolean(),
  stock: z.boolean(),
  expiration: z.boolean(),
  cima: z.boolean(),
  adherence: z.boolean(),
  doses: z.boolean().default(true),
  appointments: z.boolean(),
  appointmentReminderPreset: z.enum(['3h', '12h', '1d', 'custom']),
  customAppointmentReminderHours: z.number().int().positive().max(168),
});

export const settingsSchema = z.object({
  theme: z.enum(themeOptions),
  font: z.enum(fontOptions),
  fontSize: z.enum(fontSizeOptions),
  avatarKey: z.string().trim().min(1).max(100).optional(),
  notifications: notificationSettingsSchema,
});

export const updateSettingsSchema = settingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one setting must be provided.',
  },
);

export type SettingsInput = z.infer<typeof settingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
