import { z } from 'zod';

import { dateSchema, objectIdSchema } from './common.schema';

const calendarRangeFields = {
  from: dateSchema('from'),
  to: dateSchema('to'),
  blisterId: objectIdSchema.optional(),
};

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((value) => value === true || value === 'true' || value === '1');

const refineRange = (value: { from: Date; to: Date }, ctx: z.RefinementCtx): void => {
  if (value.to <= value.from) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'to must be later than from.',
    });
  }
};

export const upcomingDosesQuerySchema = z
  .object({
    ...calendarRangeFields,
    includeTaken: optionalBooleanQuerySchema,
  })
  .superRefine(refineRange);

export const calendarQuerySchema = z
  .object({
    ...calendarRangeFields,
    kinds: z
      .string()
      .optional()
      .transform((raw) => {
        if (!raw) {
          return ['appointments', 'doses'] as const;
        }
        return raw
          .split(',')
          .map((token) => token.trim())
          .filter((token): token is 'appointments' | 'doses' => token === 'appointments' || token === 'doses');
      }),
  })
  .superRefine(refineRange);

export type UpcomingDosesQuery = z.infer<typeof upcomingDosesQuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
