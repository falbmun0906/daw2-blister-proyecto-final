import {
  createBlisterSchema,
  createInviteSchema,
  joinBlisterSchema,
} from '../blister.schema';
import {
  settingsSchema,
  updateSettingsSchema,
} from '../settings.schema';

describe('blister and settings shared schemas', () => {
  it('validates blister creation with trimmed names', () => {
    const parsed = createBlisterSchema.parse({
      name: '  Casa Abuela  ',
      ignored: 'value',
    });

    expect(parsed).toEqual({
      name: 'Casa Abuela',
    });
  });

  it('normalizes invitation codes and roles', () => {
    const joinParsed = joinBlisterSchema.parse({
      code: ' ab12cd ',
    });
    const inviteParsed = createInviteSchema.parse({
      role: 'CAREGIVER',
    });

    expect(joinParsed.code).toBe('AB12CD');
    expect(inviteParsed.role).toBe('CAREGIVER');
  });

  it('accepts valid accessibility settings updates', () => {
    const parsed = settingsSchema.parse({
      theme: 'system',
      font: 'dyslexic',
      fontSize: 'large',
    });

    expect(parsed.font).toBe('dyslexic');
  });

  it('rejects empty settings patches', () => {
    const result = updateSettingsSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
