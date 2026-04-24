import { z } from 'zod';

import {
  futureDateSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
} from './common.schema';

export const blisterAppointmentParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const appointmentIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

const appointmentBaseSchema = z.object({
  title: nonEmptyTrimmedString('Appointment title', 200),
  date: futureDateSchema('date'),
  treatmentId: objectIdSchema.optional(),
});

export const createAppointmentSchema = appointmentBaseSchema;

export const updateAppointmentSchema = appointmentBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one appointment field must be provided.',
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
