import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  objectIdSchema,
  optionalTrimmedString,
  positiveIntegerSchema,
} from './common.schema';

export const blisterLogParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const logIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const adherenceLogsListQuerySchema = collectionPaginationQuerySchema;

export const createAdherenceLogSchema = z
  .object({
    medicineId: objectIdSchema,
    treatmentId: objectIdSchema,
    force: z.boolean().optional(),
    notes: optionalTrimmedString(500),
    amount: positiveIntegerSchema('Amount').optional(),
  })
  .superRefine((value, context) => {
    if (value.force === true && !value.notes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message: 'notes is required when force is true.',
      });
    }
  });

export type CreateAdherenceLogInput = z.infer<typeof createAdherenceLogSchema>;
export type AdherenceLogsListQuery = z.infer<typeof adherenceLogsListQuerySchema>;
