import { z } from 'zod';

import {
  dateSchema,
  nonNegativeIntegerSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  optionalTrimmedString,
  positiveIntegerSchema,
} from './common.schema';

export const inventoryQueryInputSchema = z.object({
  blisterId: objectIdSchema.optional(),
  text: optionalTrimmedString(120),
  stockState: z.enum(['any', 'low', 'out']).default('any'),
  expirationState: z.enum(['any', 'expired', 'expiring_30d']).default('any'),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
});

export const adherenceLoggerInputSchema = z.object({
  blisterId: objectIdSchema,
  medicineId: objectIdSchema,
  treatmentId: objectIdSchema,
  amount: positiveIntegerSchema('Amount').optional(),
  forced: z.boolean().default(false),
  timestamp: dateSchema('timestamp').optional(),
  notes: optionalTrimmedString(500),
}).superRefine((value, context) => {
  if (value.forced && !value.notes) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'notes is required when forced is true.',
    });
  }
});

export const stockModifierInputSchema = z.object({
  blisterId: objectIdSchema,
  medicineId: objectIdSchema,
  mode: z.enum(['set', 'delta']),
  value: z.coerce.number().int(),
}).superRefine((value, context) => {
  if (value.mode === 'set' && value.value < 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'value cannot be negative when mode is set.',
    });
  }

  if (value.mode === 'delta' && value.value === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['value'],
      message: 'value must be different from 0 when mode is delta.',
    });
  }
});

const fromToRangeSchema = z.object({
  from: dateSchema('from').optional(),
  to: dateSchema('to').optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['to'],
      message: 'to must be greater than or equal to from.',
    });
  }
});

export const scheduleAssistantInputSchema = fromToRangeSchema.extend({
  blisterId: objectIdSchema.optional(),
  lookAheadHours: positiveIntegerSchema('lookAheadHours').max(24 * 14).default(24),
});

export const appointmentManagerInputSchema = fromToRangeSchema.extend({
  blisterId: objectIdSchema.optional(),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
});

export const officialSourceLinkerInputSchema = z.object({
  blisterId: objectIdSchema.optional(),
  medicineId: objectIdSchema.optional(),
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.').optional(),
}).superRefine((value, context) => {
  if (!value.medicineId && !value.nregist) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'medicineId or nregist must be provided.',
    });
  }
});

export const mcpTokenHeaderSchema = z.object({
  token: nonEmptyTrimmedString('MCP token', 1024),
});

export const stockModifierResultSchema = z.object({
  stockBefore: nonNegativeIntegerSchema('stockBefore'),
  stockAfter: nonNegativeIntegerSchema('stockAfter'),
  stockStatus: z.enum(['ok', 'low', 'out']),
});

export type InventoryQueryInput = z.infer<typeof inventoryQueryInputSchema>;
export type AdherenceLoggerInput = z.infer<typeof adherenceLoggerInputSchema>;
export type StockModifierInput = z.infer<typeof stockModifierInputSchema>;
export type ScheduleAssistantInput = z.infer<typeof scheduleAssistantInputSchema>;
export type AppointmentManagerInput = z.infer<typeof appointmentManagerInputSchema>;
export type OfficialSourceLinkerInput = z.infer<typeof officialSourceLinkerInputSchema>;
