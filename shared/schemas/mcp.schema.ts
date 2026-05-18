import { z } from 'zod';

import {
  nonNegativeQuantityValueSchema,
  nonNegativeQuantitySchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  positiveIntegerSchema,
  positiveQuantitySchema,
  timeZoneSchema,
} from './common.schema';
import { stockUnits } from './schema.constants';

const mcpInputDateStringSchema = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `El campo ${fieldName} es obligatorio.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: `El campo ${fieldName} debe ser una fecha ISO válida.`,
    });

const mcpInputDateSchema = (fieldName: string) =>
  mcpInputDateStringSchema(fieldName).transform((value) => new Date(value));

const optionalSearchTextSchema = (fieldName: string, maxLength = 120) =>
  nonEmptyTrimmedString(fieldName, maxLength).optional();

const blisterLocatorShape = {
  blisterId: objectIdSchema.optional(),
  blisterName: optionalSearchTextSchema('Blister name'),
};

const validateSingleBlisterLocator = (value: { blisterId?: string; blisterName?: string }, context: z.RefinementCtx): void => {
  if (value.blisterId && value.blisterName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['blisterName'],
      message: 'Usa blisterId o blisterName, no ambos.',
    });
  }
};

const validateRequiredBlisterLocator = (value: { blisterId?: string; blisterName?: string }, context: z.RefinementCtx): void => {
  validateSingleBlisterLocator(value, context);

  if (!value.blisterId && !value.blisterName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'Debes indicar blisterId o blisterName.',
    });
  }
};

export const inventoryQueryInputSchema = z.object({
  ...blisterLocatorShape,
  text: optionalSearchTextSchema('Search text'),
  stockState: z.enum(['any', 'low', 'out']).default('any'),
  expirationState: z.enum(['any', 'expired', 'expiring_30d']).default('any'),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
}).superRefine(validateSingleBlisterLocator);

export const blisterListInputSchema = z.object({
  text: optionalSearchTextSchema('Search text'),
  includeMembers: z.boolean().default(false),
});

export const blisterMembersInputSchema = z.object({
  ...blisterLocatorShape,
}).superRefine(validateRequiredBlisterLocator);

export const medicineLookupInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema.optional(),
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.').optional(),
  text: optionalSearchTextSchema('Search text'),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
}).superRefine((value, context) => {
  validateSingleBlisterLocator(value, context);

  if (!value.medicineId && !value.nregist && !value.text) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'Debes indicar medicineId, nregist o text.',
    });
  }
});

export const medicineCatalogSearchInputSchema = z.object({
  ...blisterLocatorShape,
  commercialName: nonEmptyTrimmedString('Commercial medicine name', 100),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(20).default(8),
}).superRefine(validateSingleBlisterLocator);

export const medicineAddInputSchema = z.object({
  ...blisterLocatorShape,
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.'),
  alias: z.string().trim().max(100, 'El alias no puede superar los 100 caracteres.').optional(),
  stock: nonNegativeQuantitySchema('Stock'),
  stockUnit: z.enum(stockUnits),
  threshold: nonNegativeQuantitySchema('Threshold').default(5),
  expDate: mcpInputDateSchema('expDate').refine((value) => value.getTime() > Date.now(), {
    message: 'La fecha de caducidad debe ser futura.',
  }),
}).superRefine(validateRequiredBlisterLocator);

export const adherenceLoggerInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema,
  treatmentId: objectIdSchema,
  amount: positiveQuantitySchema('Amount').optional(),
  forced: z.boolean().default(false),
  timestamp: mcpInputDateSchema('timestamp').optional(),
  notes: optionalSearchTextSchema('Notes', 500),
}).superRefine((value, context) => {
  validateRequiredBlisterLocator(value, context);

  if (value.forced && !value.notes) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'La nota es obligatoria cuando forced es true.',
    });
  }
});

export const stockModifierInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema,
  mode: z.enum(['set', 'delta']),
  value: z.coerce.number().refine((amount) => Number.isFinite(amount), {
    message: 'El valor debe ser un número válido.',
  }).refine((amount) => Number.isInteger(amount * 2), {
    message: 'El valor debe usar incrementos de 0,5.',
  }),
}).superRefine((value, context) => {
  validateRequiredBlisterLocator(value, context);

  if (value.mode === 'set' && value.value < 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'El valor no puede ser negativo cuando mode es set.',
    });
  }

  if (value.mode === 'delta' && value.value === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'El valor debe ser distinto de 0 cuando mode es delta.',
    });
  }
});

const fromToRangeSchema = z.object({
  from: mcpInputDateSchema('from').optional(),
  to: mcpInputDateSchema('to').optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
    });
  }
});

export const scheduleAssistantInputSchema = fromToRangeSchema.extend({
  ...blisterLocatorShape,
  lookAheadHours: positiveIntegerSchema('lookAheadHours').max(24 * 14).default(24),
}).superRefine(validateSingleBlisterLocator);

export const appointmentManagerInputSchema = fromToRangeSchema.extend({
  ...blisterLocatorShape,
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
}).superRefine(validateSingleBlisterLocator);

export const appointmentCreateInputSchema = z.object({
  ...blisterLocatorShape,
  patientUserId: objectIdSchema,
  title: nonEmptyTrimmedString('Appointment title', 200),
  location: z.string().trim().max(200, 'El lugar no puede superar los 200 caracteres.').nullable().optional(),
  description: z.string().trim().max(600, 'La descripción no puede superar los 600 caracteres.').nullable().optional(),
  date: mcpInputDateStringSchema('date'),
  timeZone: timeZoneSchema.optional(),
  treatmentId: objectIdSchema.nullable().optional(),
}).superRefine(validateRequiredBlisterLocator);

export const appointmentCommentManagerInputSchema = z.object({
  ...blisterLocatorShape,
  action: z.enum(['list', 'add', 'update', 'delete']),
  appointmentId: objectIdSchema,
  commentId: objectIdSchema.optional(),
  text: optionalSearchTextSchema('Comment', 500),
}).superRefine((value, context) => {
  validateRequiredBlisterLocator(value, context);

  if ((value.action === 'add' || value.action === 'update') && !value.text) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['text'],
      message: 'El texto es obligatorio para añadir o actualizar comentarios.',
    });
  }

  if ((value.action === 'update' || value.action === 'delete') && !value.commentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['commentId'],
      message: 'commentId es obligatorio para actualizar o eliminar comentarios.',
    });
  }
});

export const officialSourceLinkerInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema.optional(),
  nregist: z.string().trim().regex(/^\d+$/, 'El número de registro debe ser numérico.').optional(),
}).superRefine((value, context) => {
  validateSingleBlisterLocator(value, context);

  if (!value.medicineId && !value.nregist) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'Debes indicar medicineId o nregist.',
    });
  }
});

export const mcpTokenHeaderSchema = z.object({
  token: nonEmptyTrimmedString('MCP token', 1024),
});

export const stockModifierResultSchema = z.object({
  stockBefore: nonNegativeQuantityValueSchema,
  stockAfter: nonNegativeQuantityValueSchema,
  stockStatus: z.enum(['ok', 'low', 'out']),
});

export type InventoryQueryInput = z.infer<typeof inventoryQueryInputSchema>;
export type BlisterListInput = z.infer<typeof blisterListInputSchema>;
export type BlisterMembersInput = z.infer<typeof blisterMembersInputSchema>;
export type MedicineLookupInput = z.infer<typeof medicineLookupInputSchema>;
export type MedicineCatalogSearchInput = z.infer<typeof medicineCatalogSearchInputSchema>;
export type MedicineAddInput = z.infer<typeof medicineAddInputSchema>;
export type AdherenceLoggerInput = z.infer<typeof adherenceLoggerInputSchema>;
export type StockModifierInput = z.infer<typeof stockModifierInputSchema>;
export type ScheduleAssistantInput = z.infer<typeof scheduleAssistantInputSchema>;
export type AppointmentManagerInput = z.infer<typeof appointmentManagerInputSchema>;
export type AppointmentCreateInput = z.infer<typeof appointmentCreateInputSchema>;
export type AppointmentCommentManagerInput = z.infer<typeof appointmentCommentManagerInputSchema>;
export type OfficialSourceLinkerInput = z.infer<typeof officialSourceLinkerInputSchema>;
