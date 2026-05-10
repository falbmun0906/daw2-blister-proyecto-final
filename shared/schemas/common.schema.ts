import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId.');

export const nonEmptyTrimmedString = (fieldName: string, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required.`)
    .max(maxLength, `${fieldName} must be ${maxLength} characters or fewer.`);

export const futureDateSchema = (fieldName: string) =>
  z.coerce.date().refine((value) => value.getTime() > Date.now(), {
    message: `${fieldName} must be in the future.`,
  });

export const dateSchema = (fieldName: string) =>
  z.coerce.date({
    error: `${fieldName} must be a valid date.`,
  });

export const optionalTrimmedString = (maxLength = 500) =>
  z
    .string()
    .trim()
    .max(maxLength, `Value must be ${maxLength} characters or fewer.`)
    .optional();

const hasHalfStep = (value: number): boolean => Number.isInteger(value * 2);

const finiteNumberSchema = (fieldName: string) =>
  z.coerce.number().refine((value) => Number.isFinite(value), {
    message: `${fieldName} must be a valid number.`,
  });

export const positiveQuantityValueSchema = z.number().refine((value) => Number.isFinite(value), {
  message: 'Value must be a valid number.',
}).positive().refine(hasHalfStep, {
  message: 'Value must use increments of 0.5.',
});

export const nonNegativeQuantityValueSchema = z.number().refine((value) => Number.isFinite(value), {
  message: 'Value must be a valid number.',
}).min(0).refine(hasHalfStep, {
  message: 'Value must use increments of 0.5.',
});

export const positiveIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().positive(`${fieldName} must be greater than 0.`);

export const nonNegativeIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().min(0, `${fieldName} cannot be negative.`);

export const positiveQuantitySchema = (fieldName: string) =>
  finiteNumberSchema(fieldName)
    .positive(`${fieldName} must be greater than 0.`)
    .refine(hasHalfStep, {
      message: `${fieldName} must use increments of 0.5.`,
    });

export const nonNegativeQuantitySchema = (fieldName: string) =>
  finiteNumberSchema(fieldName)
    .min(0, `${fieldName} cannot be negative.`)
    .refine(hasHalfStep, {
      message: `${fieldName} must use increments of 0.5.`,
    });

export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must use HH:mm format.');

export const collectionPaginationQuerySchema = z.object({
  page: positiveIntegerSchema('Page').default(1),
  limit: positiveIntegerSchema('Limit').max(100, 'Limit must be 100 or fewer.').default(20),
});
