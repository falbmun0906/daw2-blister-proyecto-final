import { z } from 'zod';

import {
  nonEmptyTrimmedString,
  objectIdSchema,
} from './common.schema';
import { blisterAvatarKeys, blisterRoles } from './schema.constants';

export const blisterIdParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const blisterParamsSchema = z.object({
  id: objectIdSchema,
});

export const memberIdParamsSchema = z.object({
  id: objectIdSchema,
  memberId: objectIdSchema,
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(blisterRoles),
});

export const blisterAvatarKeySchema = z.enum(blisterAvatarKeys);

export const createBlisterSchema = z.object({
  name: nonEmptyTrimmedString('Blister name', 120),
  avatarKey: blisterAvatarKeySchema.optional(),
});

export const updateBlisterSchema = z
  .object({
    name: nonEmptyTrimmedString('Blister name', 120).optional(),
    avatarKey: blisterAvatarKeySchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un dato del blíster.',
  });

export const createInviteSchema = z.object({
  role: z.enum(blisterRoles),
});

export const joinBlisterSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,8}$/, 'El código de invitación debe tener entre 6 y 8 caracteres alfanuméricos.'),
});

export type CreateBlisterInput = z.infer<typeof createBlisterSchema>;
export type UpdateBlisterInput = z.infer<typeof updateBlisterSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type JoinBlisterInput = z.infer<typeof joinBlisterSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
