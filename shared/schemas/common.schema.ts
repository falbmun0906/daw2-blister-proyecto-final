import { z } from 'zod';

const fieldLabels: Record<string, string> = {
  Name: 'nombre',
  Page: 'página',
  Limit: 'límite',
  Stock: 'stock',
  Threshold: 'umbral',
  Amount: 'cantidad',
  Comment: 'comentario',
  Key: 'clave',
  'Blister name': 'nombre del blíster',
  'Search query': 'búsqueda',
  'Search text': 'texto de búsqueda',
  'Commercial medicine name': 'nombre comercial del medicamento',
  'MCP token': 'token MCP',
  'Appointment title': 'título de la cita',
  'Treatment title': 'título del tratamiento',
  'Frequency in hours': 'frecuencia en horas',
  date: 'fecha',
  expDate: 'fecha de caducidad',
  timestamp: 'fecha y hora',
  firstDoseAt: 'primera toma',
  startDate: 'fecha de inicio',
  endDate: 'fecha de fin',
  from: 'fecha de inicio',
  to: 'fecha de fin',
  lookAheadHours: 'horas de planificación',
};

const fieldLabel = (fieldName: string): string => fieldLabels[fieldName] ?? fieldName;

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Identificador no válido.');

export const nonEmptyTrimmedString = (fieldName: string, maxLength = 200) =>
  z
    .string()
    .trim()
    .min(1, `El campo ${fieldLabel(fieldName)} es obligatorio.`)
    .max(maxLength, `El campo ${fieldLabel(fieldName)} no puede superar los ${maxLength} caracteres.`);

export const futureDateSchema = (fieldName: string) =>
  z.coerce.date().refine((value) => value.getTime() > Date.now(), {
    message: `El campo ${fieldLabel(fieldName)} debe ser una fecha futura.`,
  });

export const dateSchema = (fieldName: string) =>
  z.coerce.date({
    error: `El campo ${fieldLabel(fieldName)} debe ser una fecha válida.`,
  });

export const optionalTrimmedString = (maxLength = 500) =>
  z
    .string()
    .trim()
    .max(maxLength, `El valor no puede superar los ${maxLength} caracteres.`)
    .optional();

const hasHalfStep = (value: number): boolean => Number.isInteger(value * 2);

const finiteNumberSchema = (fieldName: string) =>
  z.coerce.number().refine((value) => Number.isFinite(value), {
    message: `El campo ${fieldLabel(fieldName)} debe ser un número válido.`,
  });

export const positiveQuantityValueSchema = z.number().refine((value) => Number.isFinite(value), {
  message: 'El valor debe ser un número válido.',
}).positive().refine(hasHalfStep, {
  message: 'El valor debe usar incrementos de 0,5.',
});

export const nonNegativeQuantityValueSchema = z.number().refine((value) => Number.isFinite(value), {
  message: 'El valor debe ser un número válido.',
}).min(0).refine(hasHalfStep, {
  message: 'El valor debe usar incrementos de 0,5.',
});

export const positiveIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().positive(`El campo ${fieldLabel(fieldName)} debe ser mayor que 0.`);

export const nonNegativeIntegerSchema = (fieldName: string) =>
  z.coerce.number().int().min(0, `El campo ${fieldLabel(fieldName)} no puede ser negativo.`);

export const positiveQuantitySchema = (fieldName: string) =>
  finiteNumberSchema(fieldName)
    .positive(`El campo ${fieldLabel(fieldName)} debe ser mayor que 0.`)
    .refine(hasHalfStep, {
      message: `El campo ${fieldLabel(fieldName)} debe usar incrementos de 0,5.`,
    });

export const nonNegativeQuantitySchema = (fieldName: string) =>
  finiteNumberSchema(fieldName)
    .min(0, `El campo ${fieldLabel(fieldName)} no puede ser negativo.`)
    .refine(hasHalfStep, {
      message: `El campo ${fieldLabel(fieldName)} debe usar incrementos de 0,5.`,
    });

export const timeOfDaySchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe usar el formato HH:mm.');

export const collectionPaginationQuerySchema = z.object({
  page: positiveIntegerSchema('Page').default(1),
  limit: positiveIntegerSchema('Limit').max(100, 'El límite debe ser 100 o menos.').default(20),
});
