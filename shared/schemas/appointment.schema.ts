import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  futureDateSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
} from './common.schema';

export const blisterAppointmentParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const appointmentIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const appointmentsListQuerySchema = collectionPaginationQuerySchema;

const appointmentBaseSchema = z.object({
  patientUserId: objectIdSchema,
  title: nonEmptyTrimmedString('Appointment title', 200),
  location: optionalTrimmedString(200),
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
export type AppointmentsListQuery = z.infer<typeof appointmentsListQuerySchema>;

/** Schema de respuesta tal como lo emite el backend (`toAppointmentView`). */
export const appointmentSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  patientUserId: objectIdSchema,
  title: z.string(),
  location: z.string().nullable(),
  date: z.string(),
  treatmentId: objectIdSchema.nullable(),
});

export type Appointment = z.infer<typeof appointmentSchema>;
