import { z } from 'zod';

import {
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
} from './common.schema';
import { updateSettingsSchema } from './settings.schema';

const passwordSchema = z
  .string()
  .trim()
  .min(8, 'Password must be at least 8 characters long.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/\d/, 'Password must include a number.')
  .regex(/[^\w\s]/, 'Password must include a symbol.');

const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,8}$/, 'Invite code must contain 6 to 8 alphanumeric characters.')
  .optional();

export const registerSchema = z
  .object({
    name: nonEmptyTrimmedString('Name', 100),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Username must be at least 3 characters long.')
      .max(50, 'Username must be 50 characters or fewer.')
      .regex(/^[a-z0-9._-]+$/, 'Username contains invalid characters.'),
    email: z.string().trim().toLowerCase().email('Email must be valid.'),
    password: passwordSchema,
    confirmPassword: z.string().trim(),
    privacyConsent: z.literal(true, {
      error: 'Privacy consent is required.',
    }),
    ageConfirmed: z.literal(true, {
      error: 'Age confirmation is required.',
    }),
    inviteCode: inviteCodeSchema,
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match.',
      });
    }
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Identifier must be at least 3 characters long.')
    .max(150, 'Identifier must be 150 characters or fewer.'),
  password: z.string().trim().min(1, 'Password is required.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required.'),
});

export const authUserParamsSchema = z.object({
  userId: objectIdSchema,
});

export const updateProfileSchema = z
  .object({
    name: nonEmptyTrimmedString('Name', 100).optional(),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Username must be at least 3 characters long.')
      .max(50, 'Username must be 50 characters or fewer.')
      .regex(/^[a-z0-9._-]+$/, 'Username contains invalid characters.')
      .optional(),
    email: z.string().trim().toLowerCase().email('Email must be valid.').optional(),
    settings: updateSettingsSchema.optional(),
    currentPassword: optionalTrimmedString(255),
    newPassword: passwordSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.newPassword && !value.currentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentPassword'],
        message: 'Current password is required to set a new password.',
      });
    }

    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one profile field must be provided.',
      });
    }
  });

export const mcpTokenSchema = z.object({
  expiresInDays: z.coerce.number().int().positive().max(90).optional(),
});

export const revokeMcpTokenSchema = z.object({});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type McpTokenInput = z.infer<typeof mcpTokenSchema>;
