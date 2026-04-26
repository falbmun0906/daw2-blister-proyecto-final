import { z } from 'zod';

import {
  fontOptions,
  fontSizeOptions,
  themeOptions,
} from './schema.constants';

export const settingsSchema = z.object({
  theme: z.enum(themeOptions),
  font: z.enum(fontOptions),
  fontSize: z.enum(fontSizeOptions),
  avatarKey: z.string().trim().min(1).max(100).optional(),
});

export const updateSettingsSchema = settingsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'At least one setting must be provided.',
  },
);

export type SettingsInput = z.infer<typeof settingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
