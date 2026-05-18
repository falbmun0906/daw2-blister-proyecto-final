import { z } from 'zod';

import {
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
} from './common.schema';
import { settingsSchema } from './settings.schema';
import { updateSettingsSchema } from './settings.schema';

export const USERNAME_MAX_LENGTH = 30;

export const userSchema = z.object({
  id: objectIdSchema,
  name: nonEmptyTrimmedString('Name', 100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
    .max(USERNAME_MAX_LENGTH, `El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`)
    .regex(/^[a-z0-9._-]+$/, 'El nombre de usuario contiene caracteres no permitidos.'),
  email: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido.'),
  emailVerified: z.boolean().default(false),
  pendingEmail: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido.').nullable().optional(),
  settings: settingsSchema,
});

export const authTokensSchema = z.object({
  accessToken: z.string().trim().min(1, 'El token de acceso es obligatorio.'),
  refreshToken: z.string().trim().min(1, 'El token de refresco es obligatorio.'),
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
  .regex(/^[A-Z0-9]{6,8}$/, 'El código de invitación debe tener entre 6 y 8 caracteres alfanuméricos.')
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
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
      .max(USERNAME_MAX_LENGTH, `El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`)
      .regex(/^[a-z0-9._-]+$/, 'El nombre de usuario contiene caracteres no permitidos.'),
    email: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido.'),
    password: passwordSchema,
    confirmPassword: z.string().trim(),
    privacyConsent: z.literal(true, {
      error: 'Debes aceptar la política de privacidad.',
    }),
    ageConfirmed: z.literal(true, {
      error: 'Debes confirmar que tienes 18 años o más.',
    }),
    inviteCode: inviteCodeSchema,
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'El usuario o correo electrónico debe tener al menos 3 caracteres.')
    .max(150, 'El usuario o correo electrónico no puede superar los 150 caracteres.'),
  password: z.string().trim().min(1, 'La contraseña es obligatoria.'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'El token de refresco es obligatorio.'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().min(1, 'El token de refresco es obligatorio.').optional(),
}).default({});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(32, 'El token de recuperación es obligatorio.').max(256, 'El token de recuperación es demasiado largo.'),
    password: passwordSchema,
    confirmPassword: z.string().trim(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden.',
      });
    }
  });

export const confirmEmailSchema = z.object({
  token: z.string().trim().min(32, 'El token de confirmación de correo es obligatorio.').max(256, 'El token de confirmación de correo es demasiado largo.'),
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
      .min(3, 'El nombre de usuario debe tener al menos 3 caracteres.')
      .max(USERNAME_MAX_LENGTH, `El nombre de usuario no puede superar los ${USERNAME_MAX_LENGTH} caracteres.`)
      .regex(/^[a-z0-9._-]+$/, 'El nombre de usuario contiene caracteres no permitidos.')
      .optional(),
    email: z.string().trim().toLowerCase().email('Introduce un correo electrónico válido.').optional(),
    settings: updateSettingsSchema.optional(),
    currentPassword: optionalTrimmedString(255),
    newPassword: passwordSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.newPassword && !value.currentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['currentPassword'],
        message: 'La contraseña actual es obligatoria para guardar una contraseña nueva.',
      });
    }

    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Debes indicar al menos un dato del perfil.',
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
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmEmailInput = z.infer<typeof confirmEmailSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type McpTokenInput = z.infer<typeof mcpTokenSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type AuthTokensInput = z.infer<typeof authTokensSchema>;
export type AuthSessionInput = z.infer<typeof authSessionSchema>;
