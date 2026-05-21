import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../auth.schema';

describe('auth shared schemas', () => {
  it('trims and normalizes registration fields', () => {
    const parsed = registerSchema.parse({
      name: '  Ana Lopez  ',
      username: '  Ana.Lopez  ',
      email: '  ANA@EXAMPLE.COM  ',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: ' ab12cd ',
    });

    expect(parsed.name).toBe('Ana Lopez');
    expect(parsed.username).toBe('ana.lopez');
    expect(parsed.email).toBe('ana@example.com');
    expect(parsed.inviteCode).toBe('AB12CD');
  });

  it('rejects registration when passwords do not match', () => {
    const result = registerSchema.safeParse({
      name: 'Ana Lopez',
      username: 'ana.lopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password2!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one profile field on profile updates', () => {
    const result = updateProfileSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('accepts login identifiers without leaking transport concerns', () => {
    const parsed = loginSchema.parse({
      identifier: '  ana@example.com ',
      password: ' Password1! ',
    });

    expect(parsed.identifier).toBe('ana@example.com');
    expect(parsed.password).toBe('Password1!');
  });
});
