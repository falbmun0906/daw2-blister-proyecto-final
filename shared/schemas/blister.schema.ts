import { z } from 'zod';

import {
  nonEmptyTrimmedString,
  objectIdSchema,
} from './common.schema';
import { blisterRoles } from './schema.constants';

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

export const createBlisterSchema = z.object({
  name: nonEmptyTrimmedString('Blister name', 120),
});

export const updateBlisterSchema = z.object({
  name: nonEmptyTrimmedString('Blister name', 120),
});

export const createInviteSchema = z.object({
  role: z.enum(blisterRoles),
});

export const joinBlisterSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,8}$/, 'Invite code must contain 6 to 8 alphanumeric characters.'),
});

export type CreateBlisterInput = z.infer<typeof createBlisterSchema>;
export type UpdateBlisterInput = z.infer<typeof updateBlisterSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type JoinBlisterInput = z.infer<typeof joinBlisterSchema>;
