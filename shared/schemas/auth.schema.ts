import { z } from 'zod';

import {
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
} from './common.schema';
import { settingsSchema } from './settings.schema';
import { updateSettingsSchema } from './settings.schema';

export const userSchema = z.object({
  id: objectIdSchema,
  name: nonEmptyTrimmedString('Name', 100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters long.')
    .max(50, 'Username must be 50 characters or fewer.')
    .regex(/^[a-z0-9._-]+$/, 'Username contains invalid characters.'),
  email: z.string().trim().toLowerCase().email('Email must be valid.'),
  emailVerified: z.boolean().default(false),
  pendingEmail: z.string().trim().toLowerCase().email('Email must be valid.').nullable().optional(),
  settings: settingsSchema,
});

export const authTokensSchema = z.object({
  accessToken: z.string().trim().min(1, 'Access token is required.'),
  refreshToken: z.string().trim().min(1, 'Refresh token is required.'),
});

export const authSessionSchema = authTokensSchema.extend({
  user: userSchema,
});

export const authProfileSchema = userSchema;

const passwordSchema = z
  .string()
  .trim()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .regex(/[A-ZÁÉÍÓÚÜÑ]/, 'La contraseña debe incluir una mayúscula.')
  .regex(/[a-záéíóúüñ]/, 'La contraseña debe incluir una minúscula.')
  .regex(/\d/, 'La contraseña debe incluir un número.')
  .regex(/[^\p{L}\p{N}\s]/u, 'La contraseña debe incluir un símbolo.');

// inviteCode es opcional: si llega vacío, se transforma a undefined y no se valida.
// Si llega con contenido, se normaliza a mayúsculas y se valida el formato.
const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,8}$/, 'Invite code must contain 6 to 8 alphanumeric characters.')
  .optional()
  .or(z.literal(''))
  .transform((value) => (value === '' || value === undefined ? undefined : value));

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

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email must be valid.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(32, 'Reset token is required.').max(256, 'Reset token is too long.'),
    password: passwordSchema,
    confirmPassword: z.string().trim(),
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

export const confirmEmailSchema = z.object({
  token: z.string().trim().min(32, 'Email confirmation token is required.').max(256, 'Email confirmation token is too long.'),
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
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type McpTokenInput = z.infer<typeof mcpTokenSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type AuthTokensInput = z.infer<typeof authTokensSchema>;
export type AuthSessionInput = z.infer<typeof authSessionSchema>;
