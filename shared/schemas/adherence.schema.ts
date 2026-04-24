import { z } from 'zod';

import {
  nonNegativeIntegerSchema,
  objectIdSchema,
  optionalTrimmedString,
} from './common.schema';

export const blisterLogParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const logIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const createAdherenceLogSchema = z
  .object({
    medicineId: objectIdSchema,
    treatmentId: objectIdSchema,
    force: z.boolean().default(false),
    notes: optionalTrimmedString(500),
    amount: nonNegativeIntegerSchema('Amount').optional(),
  })
  .superRefine((value, context) => {
    if (value.force && !value.notes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'notes is required when force is true.',
      });
    }
  });

export type CreateAdherenceLogInput = z.infer<typeof createAdherenceLogSchema>;
