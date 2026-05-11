import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonNegativeQuantityValueSchema,
  objectIdSchema,
  optionalTrimmedString,
  positiveQuantitySchema,
} from './common.schema';
import { adherenceLogStatuses } from './schema.constants';

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
    status: z.enum(adherenceLogStatuses).default('taken'),
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

type CreateAdherenceLogPayload = z.infer<typeof createAdherenceLogSchema>;
export type CreateAdherenceLogInput = Omit<CreateAdherenceLogPayload, 'status'> & {
  status?: CreateAdherenceLogPayload['status'];
};
export type AdherenceLogsListQuery = z.infer<typeof adherenceLogsListQuerySchema>;

/** Schema de respuesta tal como lo emite el backend (`toAdherenceLogView`). */
export const adherenceLogSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  medicineId: objectIdSchema,
  treatmentId: objectIdSchema,
  userId: objectIdSchema,
  status: z.enum(adherenceLogStatuses).default('taken'),
  amount: nonNegativeQuantityValueSchema,
  timestamp: z.string(),
  isForced: z.boolean(),
  notes: z.string().nullable(),
});

export type AdherenceLog = z.infer<typeof adherenceLogSchema>;
