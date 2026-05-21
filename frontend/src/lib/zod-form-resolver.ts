import type { FieldError, FieldErrors, FieldValues, MultipleFieldErrors, Resolver } from 'react-hook-form';

type ZodIssueLike = {
  code: string;
  message?: string;
  path: Array<string | number | symbol>;
  input?: unknown;
  origin?: string;
  format?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
};

type SafeParseResult<TFieldValues extends FieldValues> =
  | { success: true; data: TFieldValues }
  | { success: false; error: { issues: ZodIssueLike[] } };

type SafeParseSchema<TFieldValues extends FieldValues> = {
  safeParse: (values: unknown) => SafeParseResult<TFieldValues>;
};

const SPANISH_MESSAGE_PATTERN = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]|\b(El|La|Los|Las|Debe|Debes|Introduce|Indica|Selecciona|Solo|Mínimo|Máximo|Correo|Código|Nombre|Contraseña|Fecha|Hora|Stock|Umbral|Medicamento|Tratamiento)\b/u;

const KNOWN_ENGLISH_MESSAGES: Record<string, string> = {
  'Invalid input': 'El valor no es válido.',
  'Required': 'Este campo es obligatorio.',
  'Invalid email address': 'Introduce un correo electrónico válido.',
  'Invalid url': 'Introduce una URL válida.',
};

function formatLimit(value: number | bigint | undefined): string {
  return value === undefined ? '' : String(value);
}

function pluralize(count: number | bigint | undefined, singular: string, plural: string): string {
  return count === 1 || count === 1n ? singular : plural;
}

function fallbackMessage(issue: ZodIssueLike): string {
  if (issue.code === 'invalid_type') {
    return issue.input === undefined ? 'Este campo es obligatorio.' : 'El valor no tiene el tipo esperado.';
  }

  if (issue.code === 'invalid_format') {
    if (issue.format === 'email') return 'Introduce un correo electrónico válido.';
    if (issue.format === 'url') return 'Introduce una URL válida.';
    return 'El formato no es válido.';
  }

  if (issue.code === 'too_small') {
    const limit = formatLimit(issue.minimum);
    if (issue.origin === 'string') return `Debe tener al menos ${limit} ${pluralize(issue.minimum, 'carácter', 'caracteres')}.`;
    if (issue.origin === 'array') return `Selecciona al menos ${limit} ${pluralize(issue.minimum, 'elemento', 'elementos')}.`;
    return `Debe ser como mínimo ${limit}.`;
  }

  if (issue.code === 'too_big') {
    const limit = formatLimit(issue.maximum);
    if (issue.origin === 'string') return `No puede superar ${limit} ${pluralize(issue.maximum, 'carácter', 'caracteres')}.`;
    if (issue.origin === 'array') return `No puede superar ${limit} ${pluralize(issue.maximum, 'elemento', 'elementos')}.`;
    return `Debe ser como máximo ${limit}.`;
  }

  return 'El valor no es válido.';
}

export function getZodIssueMessage(issue: ZodIssueLike): string {
  const message = issue.message?.trim();
  if (!message) return fallbackMessage(issue);
  if (SPANISH_MESSAGE_PATTERN.test(message)) return message;
  return KNOWN_ENGLISH_MESSAGES[message] ?? fallbackMessage(issue);
}

function setNestedError(
  errors: Record<string, unknown>,
  path: string[],
  fieldError: FieldError,
  collectAll: boolean,
): void {
  const segments = path.length > 0 ? path : ['root'];
  let target = errors;

  for (const segment of segments.slice(0, -1)) {
    const current = target[segment];
    if (typeof current !== 'object' || current === null || 'message' in current) {
      target[segment] = {};
    }
    target = target[segment] as Record<string, unknown>;
  }

  const key = segments[segments.length - 1];
  const current = target[key] as FieldError | undefined;

  if (!current?.message) {
    target[key] = fieldError;
    return;
  }

  if (!collectAll) return;

  current.types = {
    ...(current.types ?? {}),
    ...(fieldError.types ?? {}),
  } as MultipleFieldErrors;
}

export function createZodFormResolver<TFieldValues extends FieldValues>(
  schema: SafeParseSchema<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const parsed = schema.safeParse(values);

    if (parsed.success) {
      return {
        values: parsed.data,
        errors: {},
      };
    }

    const errors: Record<string, unknown> = {};
    const collectAll = options.criteriaMode === 'all';

    parsed.error.issues.forEach((issue, index) => {
      const message = getZodIssueMessage(issue);
      const type = issue.code || 'validation';
      const fieldError: FieldError = {
        type,
        message,
        types: collectAll ? { [`${type}-${index}`]: message } : undefined,
      };

      setNestedError(errors, issue.path.map(String), fieldError, collectAll);
    });

    return {
      values: {},
      errors: errors as FieldErrors<TFieldValues>,
    };
  };
}