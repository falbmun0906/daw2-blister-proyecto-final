import { describe, expect, it } from 'vitest';

import { loginSchema, type LoginInput } from '../../../shared/schemas/auth.schema';
import { createZodFormResolver } from './zod-form-resolver';

const resolverOptions = {
  criteriaMode: 'all',
  fields: {},
  names: ['identifier', 'password'],
  shouldUseNativeValidation: false,
} as never;

describe('createZodFormResolver', () => {
  it('maps invalid login values to Spanish form errors', async () => {
    const resolver = createZodFormResolver<LoginInput>(loginSchema);

    const result = await resolver({ identifier: '', password: '' }, undefined, resolverOptions);

    expect(result.errors.identifier?.message).toBe('El usuario o correo electrónico debe tener al menos 3 caracteres.');
    expect(result.errors.password?.message).toBe('La contraseña es obligatoria.');
  });

  it('returns parsed values without errors when the schema succeeds', async () => {
    const resolver = createZodFormResolver<LoginInput>(loginSchema);

    const result = await resolver(
      { identifier: '  ana@example.com ', password: ' Password1! ' },
      undefined,
      resolverOptions,
    );

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ identifier: 'ana@example.com', password: 'Password1!' });
  });
});