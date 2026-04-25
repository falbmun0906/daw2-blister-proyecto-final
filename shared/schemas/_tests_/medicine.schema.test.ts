import {
  createMedicineSchema,
  externalSearchQuerySchema,
  medicinesListQuerySchema,
  updateMedicineSchema,
} from '../medicine.schema';

describe('medicine shared schemas', () => {
  it('applies defaults and strips unknown fields on creation', () => {
    const parsed = createMedicineSchema.parse({
      nregist: '123456',
      alias: ' Paracetamol casa ',
      stock: 12,
      stockUnit: 'pastillas',
      expDate: '2030-04-25T00:00:00.000Z',
      ignored: 'value',
    });

    expect(parsed.threshold).toBe(5);
    expect(parsed.alias).toBe('Paracetamol casa');
    expect('ignored' in parsed).toBe(false);
  });

  it('rejects invalid AEMPS registry values', () => {
    const result = createMedicineSchema.safeParse({
      nregist: 'ABC123',
      stock: 12,
      stockUnit: 'pastillas',
      expDate: '2030-04-25T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('applies collection pagination defaults', () => {
    const parsed = medicinesListQuerySchema.parse({});

    expect(parsed).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('requires a non-empty search term for external medicine search', () => {
    const result = externalSearchQuerySchema.safeParse({
      q: '   ',
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one field on medicine updates', () => {
    const result = updateMedicineSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
