import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
  positiveIntegerSchema,
  positiveQuantitySchema,
  positiveQuantityValueSchema,
  timeOfDaySchema,
} from './common.schema';

export const blisterTreatmentParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const treatmentIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const treatmentsListQuerySchema = collectionPaginationQuerySchema;

export const treatmentScheduleTypeSchema = z.enum(['interval', 'daily_times']);

const dailyDoseTimesSchema = z.array(timeOfDaySchema).max(12, 'Un medicamento puede incluir como máximo 12 horas exactas al día.');

export const treatmentMedicineSchema = z
  .object({
    medicineId: objectIdSchema,
    amount: positiveQuantitySchema('Amount'),
    firstDoseAt: dateSchema('firstDoseAt'),
    scheduleType: treatmentScheduleTypeSchema.default('interval'),
    frequencyHours: positiveIntegerSchema('Frequency in hours').nullable().optional(),
    dailyDoseTimes: dailyDoseTimesSchema.default([]),
    isRecurring: z.boolean(),
    note: optionalTrimmedString(300),
  })
  .superRefine((value, context) => {
    const uniqueDailyTimes = new Set(value.dailyDoseTimes);

    if (uniqueDailyTimes.size !== value.dailyDoseTimes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyDoseTimes'],
        message: 'Las horas exactas no pueden repetirse.',
      });
    }

    if (!value.isRecurring) {
      return;
    }

    if (value.scheduleType === 'interval' && value.frequencyHours == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['frequencyHours'],
        message: 'La frecuencia en horas es obligatoria en pautas recurrentes por intervalo.',
      });
    }

    if (value.scheduleType === 'daily_times' && value.dailyDoseTimes.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dailyDoseTimes'],
        message: 'Debes indicar al menos una hora exacta en pautas recurrentes diarias.',
      });
    }
  });

const treatmentFields = {
  patientUserId: objectIdSchema,
  title: nonEmptyTrimmedString('Treatment title', 200),
  description: optionalTrimmedString(600),
  medicines: z
    .array(treatmentMedicineSchema)
    .min(1, 'El tratamiento debe incluir al menos un medicamento.'),
  startDate: dateSchema('startDate'),
  endDate: dateSchema('endDate').optional(),
  active: z.boolean().optional(),
};

const clearableEndDateSchema = z.union([z.null(), dateSchema('endDate')]).optional();

const treatmentBaseSchema = z
  .object(treatmentFields)
  .superRefine((value, context) => {
    if (value.endDate && value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
      });
    }
  });

export const createTreatmentSchema = treatmentBaseSchema;

export const updateTreatmentSchema = z
  .object({
    patientUserId: treatmentFields.patientUserId.optional(),
    title: treatmentFields.title.optional(),
    description: treatmentFields.description,
    medicines: treatmentFields.medicines.optional(),
    startDate: treatmentFields.startDate.optional(),
    endDate: clearableEndDateSchema,
    active: treatmentFields.active,
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Debes indicar al menos un dato del tratamiento.',
      });
    }

    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'La fecha de fin debe ser posterior a la fecha de inicio.',
      });
    }
  });

export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;
export type TreatmentsListQuery = z.infer<typeof treatmentsListQuerySchema>;

/** Schema de respuesta tal como lo emite el backend (`toTreatmentView`). */
export const treatmentSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  patientUserId: objectIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  medicines: z.array(
    z.object({
      medicineId: objectIdSchema,
      amount: positiveQuantityValueSchema,
      firstDoseAt: z.string(),
      scheduleType: treatmentScheduleTypeSchema,
      frequencyHours: z.number().int().positive().nullable(),
      dailyDoseTimes: z.array(timeOfDaySchema),
      isRecurring: z.boolean(),
      note: z.string().nullable(),
    }),
  ),
  startDate: z.string(),
  endDate: z.string().nullable(),
  active: z.boolean(),
});

export type Treatment = z.infer<typeof treatmentSchema>;
