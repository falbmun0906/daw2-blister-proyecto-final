import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonNegativeQuantityValueSchema,
  objectIdSchema,
  optionalTrimmedString,
  positiveQuantitySchema,
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
    timestamp: dateSchema('timestamp').optional(),
    notes: optionalTrimmedString(500),
    amount: positiveQuantitySchema('Amount').optional(),
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

/** Schema de respuesta tal como lo emite el backend (`toAdherenceLogView`). */
export const adherenceLogSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  medicineId: objectIdSchema,
  treatmentId: objectIdSchema,
  userId: objectIdSchema,
  amount: nonNegativeQuantityValueSchema,
  timestamp: z.string(),
  isForced: z.boolean(),
  notes: z.string().nullable(),
});

export type AdherenceLog = z.infer<typeof adherenceLogSchema>;
