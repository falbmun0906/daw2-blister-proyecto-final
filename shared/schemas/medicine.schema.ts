import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonEmptyTrimmedString,
  nonNegativeQuantitySchema,
  nonNegativeQuantityValueSchema,
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
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.'),
});

export const medicinesListQuerySchema = collectionPaginationQuerySchema;

export const externalSearchQuerySchema = z.object({
  q: nonEmptyTrimmedString('Search query', 100),
});

export const createMedicineSchema = z.object({
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.'),
  alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
  stock: nonNegativeQuantitySchema('Stock'),
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeQuantitySchema('Threshold').default(5),
  expDate: dateSchema('expDate').refine((value) => value.getTime() > Date.now(), {
    message: 'La fecha de caducidad debe ser futura.',
  }),
});

export const updateMedicineSchema = z
  .object({
    alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
    stock: nonNegativeQuantitySchema('Stock').optional(),
    threshold: nonNegativeQuantitySchema('Threshold').optional(),
    expDate: dateSchema('expDate')
      .refine((value) => value.getTime() > Date.now(), {
        message: 'La fecha de caducidad debe ser futura.',
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Debes indicar al menos un dato del medicamento.',
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
  stock: nonNegativeQuantityValueSchema,
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeQuantityValueSchema,
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
  fotoUrl: z.string().nullable().optional(),
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
  atcs: z.array(
    z.object({
      codigo: z.string().nullable(),
      nombre: z.string(),
    }),
  ),
  principiosActivos: z.array(
    z.object({
      nombre: z.string(),
      cantidad: z.string().nullable(),
      unidad: z.string().nullable(),
    }),
  ),
  excipientes: z.array(z.object({ nombre: z.string() })),
  viasAdministracion: z.array(z.object({ nombre: z.string() })),
  cpresc: z.string().nullable(),
  receta: z.boolean(),
  fechaAutorizacion: z.string().nullable(),
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

