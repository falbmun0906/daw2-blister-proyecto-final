import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
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

export const medicineSearchParamsSchema = z.object({
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.'),
});

export const medicinesListQuerySchema = collectionPaginationQuerySchema;

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

// ── Schemas de respuesta (lo que devuelve la API) ────────────────────────

export const medicineCimaStatusSchema = z.object({
  psum: z.boolean(),
  estado: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  hasAlerts: z.boolean(),
  comerc: z.boolean(),
  notas: z.boolean(),
  materialesInf: z.boolean(),
});

export const medicineSchema = z.object({
  _id: objectIdSchema,
  blisterId: objectIdSchema,
  nregist: z.string(),
  nombre: z.string(),
  alias: z.string().nullable().optional(),
  pactivos: z.string(),
  formaOficial: z.string(),
  dosisOficial: z.string(),
  iconType: z.enum(iconTypes),
  stock: z.number().int().min(0),
  stockUnit: z.enum(stockUnits),
  threshold: z.number().int().min(0),
  expDate: z.string(), // ISO
  cimaStatus: medicineCimaStatusSchema,
});

export const externalSearchItemSchema = z.object({
  nregist: z.string(),
  nombre: z.string(),
  pactivos: z.string(),
  labtitular: z.string().nullable(),
  formaOficial: z.string().nullable(),
  dosisOficial: z.string().nullable(),
});

export const externalMedicineInfoSchema = z.object({
  nregist: z.string(),
  nombre: z.string(),
  pactivos: z.string(),
  labtitular: z.string().nullable(),
  formaOficial: z.string().nullable(),
  formaSimplificada: z.string().nullable(),
  dosisOficial: z.string().nullable(),
  comerc: z.boolean(),
  psum: z.boolean(),
  notas: z.boolean(),
  materialesInf: z.boolean(),
  docs: z.array(
    z.object({
      tipo: z.number().optional(),
      url: z.string().optional(),
      secc: z.boolean().optional(),
    }),
  ),
  fotos: z.array(
    z.object({
      url: z.string().optional(),
      tipo: z.string().optional(),
    }),
  ),
  atcs: z.array(z.unknown()),
  principiosActivos: z.array(z.unknown()),
  conduc: z.boolean(),
  triangulo: z.boolean(),
  cimaStatus: medicineCimaStatusSchema,
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type MedicinesListQuery = z.infer<typeof medicinesListQuerySchema>;
export type Medicine = z.infer<typeof medicineSchema>;
export type MedicineCimaStatus = z.infer<typeof medicineCimaStatusSchema>;
export type ExternalSearchItem = z.infer<typeof externalSearchItemSchema>;
export type ExternalMedicineInfo = z.infer<typeof externalMedicineInfoSchema>;
export type StockUnit = (typeof stockUnits)[number];
export type IconType = (typeof iconTypes)[number];
export type CimaMedicineState = (typeof cimaMedicineStates)[number];

