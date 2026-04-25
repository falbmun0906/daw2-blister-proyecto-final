import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  positiveIntegerSchema,
} from './common.schema';

export const blisterTreatmentParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const treatmentIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const treatmentsListQuerySchema = collectionPaginationQuerySchema;

export const treatmentMedicineSchema = z.object({
  medicineId: objectIdSchema,
  amount: positiveIntegerSchema('Amount'),
  frequency: positiveIntegerSchema('Frequency'),
});

const treatmentFields = {
  title: nonEmptyTrimmedString('Treatment title', 200),
  medicines: z
    .array(treatmentMedicineSchema)
    .min(1, 'A treatment must include at least one medicine.'),
  startDate: dateSchema('startDate'),
  endDate: dateSchema('endDate').optional(),
  active: z.boolean().optional(),
};

const treatmentBaseSchema = z
  .object(treatmentFields)
  .superRefine((value, context) => {
    if (value.endDate && value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'endDate must be later than startDate.',
      });
    }
  });

export const createTreatmentSchema = treatmentBaseSchema;

export const updateTreatmentSchema = z
  .object({
    title: treatmentFields.title.optional(),
    medicines: treatmentFields.medicines.optional(),
    startDate: treatmentFields.startDate.optional(),
    endDate: treatmentFields.endDate,
    active: treatmentFields.active,
  })
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'At least one treatment field must be provided.',
      });
    }

    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'endDate must be later than startDate.',
      });
    }
  });

export type CreateTreatmentInput = z.infer<typeof createTreatmentSchema>;
export type UpdateTreatmentInput = z.infer<typeof updateTreatmentSchema>;
export type TreatmentsListQuery = z.infer<typeof treatmentsListQuerySchema>;
