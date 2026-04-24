import { z } from 'zod';

import {
  dateSchema,
  nonEmptyTrimmedString,
  nonNegativeIntegerSchema,
  objectIdSchema,
} from './common.schema';
import {
  cimaMedicineStates,
  iconTypes,
  stockUnits,
} from './schema.constants';

export const blisterMedicineParamsSchema = z.object({
  blisterId: objectIdSchema,
});

export const medicineIdParamsSchema = z.object({
  blisterId: objectIdSchema,
  id: objectIdSchema,
});

const cimaStatusSchema = z.object({
  psum: z.boolean(),
  estado: z.enum(cimaMedicineStates.map(String) as ['1', '2', '3']).transform((value) => Number(value) as 1 | 2 | 3),
  hasAlerts: z.boolean(),
});

export const createMedicineSchema = z.object({
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.'),
  nombre: nonEmptyTrimmedString('Medicine name', 200),
  alias: z.string().trim().max(100, 'Alias must be 100 characters or fewer.').optional(),
  pactivos: nonEmptyTrimmedString('Active ingredients', 300),
  formaOficial: nonEmptyTrimmedString('Official form', 200),
  dosisOficial: nonEmptyTrimmedString('Official dose', 100),
  iconType: z.enum(iconTypes),
  stock: nonNegativeIntegerSchema('Stock'),
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeIntegerSchema('Threshold').default(5),
  expDate: dateSchema('expDate').refine((value) => value.getTime() > Date.now(), {
    message: 'expDate must be in the future.',
  }),
  cimaStatus: cimaStatusSchema.optional(),
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
