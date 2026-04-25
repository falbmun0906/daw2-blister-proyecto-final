import { z } from 'zod';

import {
  dateSchema,
  nonEmptyTrimmedString,
  nonNegativeIntegerSchema,
  objectIdSchema,
  positiveIntegerSchema,
} from './common.schema';
import {
  stockUnits,
} from './schema.constants';

export const blisterMedicineParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const medicineIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

export const medicineSearchParamsSchema = z.object({
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.'),
});

export const medicinesListQuerySchema = z.object({
  page: positiveIntegerSchema('Page').default(1),
  limit: positiveIntegerSchema('Limit').max(100, 'Limit must be 100 or fewer.').default(20),
});

export const externalSearchQuerySchema = z.object({
  q: nonEmptyTrimmedString('Search query', 100),
});

export const createMedicineSchema = z.object({
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.'),
  alias: z.string().trim().max(100, 'Alias must be 100 characters or fewer.').optional(),
  stock: nonNegativeIntegerSchema('Stock'),
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeIntegerSchema('Threshold').default(5),
  expDate: dateSchema('expDate').refine((value) => value.getTime() > Date.now(), {
    message: 'expDate must be in the future.',
  }),
});

export const updateMedicineSchema = z
  .object({
    alias: z.string().trim().max(100, 'Alias must be 100 characters or fewer.').optional(),
    stock: nonNegativeIntegerSchema('Stock').optional(),
    threshold: nonNegativeIntegerSchema('Threshold').optional(),
    expDate: dateSchema('expDate')
      .refine((value) => value.getTime() > Date.now(), {
        message: 'expDate must be in the future.',
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one medicine field must be provided.',
  });

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type MedicinesListQuery = z.infer<typeof medicinesListQuerySchema>;
