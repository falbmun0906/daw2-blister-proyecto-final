import { z } from 'zod';

import {
  nonNegativeIntegerSchema,
  nonEmptyTrimmedString,
  objectIdSchema,
  positiveIntegerSchema,
} from './common.schema';

const mcpInputDateSchema = (fieldName: string) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required.`)
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: `${fieldName} must be a valid ISO date.`,
    })
    .transform((value) => new Date(value));

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
      message: 'Use either blisterId or blisterName, not both.',
    });
  }
};

const validateRequiredBlisterLocator = (value: { blisterId?: string; blisterName?: string }, context: z.RefinementCtx): void => {
  validateSingleBlisterLocator(value, context);

  if (!value.blisterId && !value.blisterName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'blisterId or blisterName must be provided.',
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
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.').optional(),
  text: optionalSearchTextSchema('Search text'),
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
}).superRefine((value, context) => {
  validateSingleBlisterLocator(value, context);

  if (!value.medicineId && !value.nregist && !value.text) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: 'medicineId, nregist or text must be provided.',
    });
  }
});

export const adherenceLoggerInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema,
  treatmentId: objectIdSchema,
  amount: positiveIntegerSchema('Amount').optional(),
  forced: z.boolean().default(false),
  timestamp: mcpInputDateSchema('timestamp').optional(),
  notes: optionalSearchTextSchema('Notes', 500),
}).superRefine((value, context) => {
  validateRequiredBlisterLocator(value, context);

  if (value.forced && !value.notes) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'notes is required when forced is true.',
    });
  }
});

export const stockModifierInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema,
  mode: z.enum(['set', 'delta']),
  value: z.coerce.number().int(),
}).superRefine((value, context) => {
  validateRequiredBlisterLocator(value, context);

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
  from: mcpInputDateSchema('from').optional(),
  to: mcpInputDateSchema('to').optional(),
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
  ...blisterLocatorShape,
  lookAheadHours: positiveIntegerSchema('lookAheadHours').max(24 * 14).default(24),
}).superRefine(validateSingleBlisterLocator);

export const appointmentManagerInputSchema = fromToRangeSchema.extend({
  ...blisterLocatorShape,
  page: positiveIntegerSchema('Page').max(100).default(1),
  limit: positiveIntegerSchema('Limit').max(100).default(20),
}).superRefine(validateSingleBlisterLocator);

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
      message: 'text is required for add and update actions.',
    });
  }

  if ((value.action === 'update' || value.action === 'delete') && !value.commentId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['commentId'],
      message: 'commentId is required for update and delete actions.',
    });
  }
});

export const officialSourceLinkerInputSchema = z.object({
  ...blisterLocatorShape,
  medicineId: objectIdSchema.optional(),
  nregist: z.string().trim().regex(/^\d+$/, 'nregist must be numeric.').optional(),
}).superRefine((value, context) => {
  validateSingleBlisterLocator(value, context);

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
export type BlisterListInput = z.infer<typeof blisterListInputSchema>;
export type BlisterMembersInput = z.infer<typeof blisterMembersInputSchema>;
export type MedicineLookupInput = z.infer<typeof medicineLookupInputSchema>;
export type AdherenceLoggerInput = z.infer<typeof adherenceLoggerInputSchema>;
export type StockModifierInput = z.infer<typeof stockModifierInputSchema>;
export type ScheduleAssistantInput = z.infer<typeof scheduleAssistantInputSchema>;
export type AppointmentManagerInput = z.infer<typeof appointmentManagerInputSchema>;
export type AppointmentCommentManagerInput = z.infer<typeof appointmentCommentManagerInputSchema>;
export type OfficialSourceLinkerInput = z.infer<typeof officialSourceLinkerInputSchema>;
