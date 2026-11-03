import { z } from 'zod';

import {
  collectionPaginationQuerySchema,
  dateSchema,
  nonEmptyTrimmedString,
  nonNegativeQuantitySchema,
  nonNegativeQuantityValueSchema,
  objectIdSchema,
} from './common.schema';
import { cimaMedicineStates, iconTypes, stockUnits } from './schema.constants';

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
export const nationalCodeParamsSchema = z.object({
  cn: z.string().regex(/^\d{6}$/, 'El Código Nacional debe tener 6 cifras.'),
});

export const externalSearchQuerySchema = z.object({
  q: nonEmptyTrimmedString('Search query', 100),
});

export const captureMethodSchema = z.enum(['search', 'manual', 'ocr', 'barcode']);

export const customMedicineDetailsSchema = z
  .object({
    productType: z.enum(['medicine', 'supplement', 'other']),
    brand: z.string().trim().max(100).optional(),
    composition: z.string().trim().max(300).optional(),
    format: z.string().trim().max(100).optional(),
    strength: z.string().trim().max(100).optional(),
  })
  .strict();

const futureExpirationSchema = dateSchema('expDate').refine(
  (value) => value.getTime() > Date.now(),
  {
    message: 'La fecha de caducidad debe ser futura.',
  },
);

const inventoryInputShape = {
  alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
  stock: nonNegativeQuantitySchema('Stock'),
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeQuantitySchema('Threshold').default(5),
  captureMethod: captureMethodSchema.optional(),
};

// An omitted source keeps existing REST/MCP clients compatible with CIMA.
export const createCimaMedicineSchema = z.object({
  ...inventoryInputShape,
  source: z.literal('cima').optional(),
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.'),
  cn: nationalCodeParamsSchema.shape.cn.optional(),
  expDate: futureExpirationSchema,
});

export const createCustomMedicineSchema = z
  .object({
    ...inventoryInputShape,
    source: z.literal('custom'),
    nombre: nonEmptyTrimmedString('Name', 200),
    customDetails: customMedicineDetailsSchema,
    expDate: futureExpirationSchema.nullable(),
  })
  .strict();

export const createMedicineSchema = z.discriminatedUnion('source', [
  createCimaMedicineSchema,
  createCustomMedicineSchema,
]);

export const updateMedicineSchema = z
  .object({
    alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
    stock: nonNegativeQuantitySchema('Stock').optional(),
    threshold: nonNegativeQuantitySchema('Threshold').optional(),
    expDate: futureExpirationSchema.nullable().optional(),
    nombre: nonEmptyTrimmedString('Name', 200).optional(),
    customDetails: customMedicineDetailsSchema.optional(),
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

const medicineResponseBase = z.object({
  _id: objectIdSchema,
  blisterId: objectIdSchema,
  identityLocked: z.boolean().optional(),
  captureMethod: captureMethodSchema.optional(),
  customDetails: customMedicineDetailsSchema.nullable().optional(),
  nregist: z.string().nullable(),
  cn: z.string().nullable().optional(),
  presentationName: z.string().nullable().optional(),
  nombre: z.string(),
  alias: z.string().nullable().optional(),
  pactivos: z.string().nullable(),
  formaOficial: z.string().nullable(),
  dosisOficial: z.string().nullable(),
  iconType: z.enum(iconTypes),
  stock: nonNegativeQuantityValueSchema,
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeQuantityValueSchema,
  expDate: z.string().nullable(), // ISO; null means unknown for custom products.
  cimaStatus: medicineCimaStatusSchema.nullable(),
});

const medicineResponseSchema = z.discriminatedUnion('source', [
  medicineResponseBase.extend({
    source: z.literal('cima'),
    customDetails: z.null().optional(),
    nregist: z.string(),
    pactivos: z.string(),
    formaOficial: z.string(),
    dosisOficial: z.string(),
    expDate: z.string(),
    cimaStatus: medicineCimaStatusSchema,
  }),
  medicineResponseBase.extend({
    source: z.literal('custom'),
    customDetails: customMedicineDetailsSchema,
    nregist: z.null(),
    cn: z.null().optional(),
    presentationName: z.null().optional(),
    pactivos: z.null(),
    formaOficial: z.null(),
    dosisOficial: z.null(),
    cimaStatus: z.null(),
  }),
]);

// Discriminator selection happens before object defaults in Zod. Normalize first.
export const medicineSchema = z.preprocess(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (!('source' in value) || value.source === undefined)
      ? { ...value, source: 'cima' }
      : value,
  medicineResponseSchema,
);

export const externalSearchItemSchema = z.object({
  cn: z.string().optional(),
  presentationName: z.string().optional(),
  nregist: z.string(),
  nombre: z.string(),
  pactivos: z.string(),
  labtitular: z.string().nullable(),
  formaOficial: z.string().nullable(),
  dosisOficial: z.string().nullable(),
  fotoUrl: z.string().nullable().optional(),
});

export const externalMedicineInfoSchema = z.object({
  cn: z.string().optional(),
  presentationName: z.string().optional(),
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
export type CreateCimaMedicineInput = z.infer<typeof createCimaMedicineSchema>;
export type CustomMedicineDetails = z.infer<typeof customMedicineDetailsSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type MedicinesListQuery = z.infer<typeof medicinesListQuerySchema>;
export type Medicine = z.infer<typeof medicineSchema>;
export type MedicineCimaStatus = z.infer<typeof medicineCimaStatusSchema>;
export type ExternalSearchItem = z.infer<typeof externalSearchItemSchema>;
export type ExternalMedicineInfo = z.infer<typeof externalMedicineInfoSchema>;
export type StockUnit = (typeof stockUnits)[number];
export type IconType = (typeof iconTypes)[number];
export type CimaMedicineState = (typeof cimaMedicineStates)[number];
