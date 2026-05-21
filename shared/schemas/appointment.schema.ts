import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
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

export const appointmentsListQuerySchema = collectionPaginationQuerySchema;

export const appointmentCommentParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
  commentId: objectIdSchema,
});

export const appointmentCommentBodySchema = z.object({
  text: nonEmptyTrimmedString('Comment', 500),
});

const nullableTrimmedString = (maxLength: number) =>
  z.string().trim().max(maxLength, `El valor no puede superar los ${maxLength} caracteres.`).nullable().optional();

const appointmentBaseSchema = z.object({
  patientUserId: objectIdSchema,
  title: nonEmptyTrimmedString('Appointment title', 200),
  location: nullableTrimmedString(200),
  description: nullableTrimmedString(600),
  date: dateSchema('date'),
  treatmentId: objectIdSchema.nullable().optional(),
});

export const createAppointmentSchema = appointmentBaseSchema;

export const updateAppointmentSchema = appointmentBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un dato de la cita.',
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentsListQuery = z.infer<typeof appointmentsListQuerySchema>;
export type AppointmentCommentInput = z.infer<typeof appointmentCommentBodySchema>;

export const appointmentCommentSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
  authorName: z.string(),
  authorAvatarKey: z.string().nullable(),
  text: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Schema de respuesta tal como lo emite el backend (`toAppointmentView`). */
export const appointmentSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  patientUserId: objectIdSchema,
  title: z.string(),
  location: z.string().nullable(),
  description: z.string().nullable(),
  date: z.string(),
  treatmentId: objectIdSchema.nullable(),
  comments: z.array(appointmentCommentSchema),
});

export type Appointment = z.infer<typeof appointmentSchema>;
