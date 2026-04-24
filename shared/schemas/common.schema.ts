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

export const positiveIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().positive(`${fieldName} must be greater than 0.`);

export const nonNegativeIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().min(0, `${fieldName} cannot be negative.`);
