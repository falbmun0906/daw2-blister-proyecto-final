import {
  createMedicineSchema,
  externalSearchQuerySchema,
  medicinesListQuerySchema,
  updateMedicineSchema,
  medicineSchema,
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

  const custom = { source: 'custom', nombre: ' Magnesio ', customDetails: { productType: 'supplement', strength: '200 mg por cápsula' }, stock: 30, stockUnit: 'pastillas', expDate: null };

  it('normalizes legacy CIMA responses and rejects mixed or incomplete origins', () => {
    const legacy = { _id: '507f1f77bcf86cd799439011', blisterId: '507f1f77bcf86cd799439012', nregist: '12345', nombre: 'Oficial', pactivos: 'P', formaOficial: 'COMPRIMIDO', dosisOficial: '1 mg', iconType: 'pill', stock: 10, stockUnit: 'pastillas', threshold: 5, expDate: '2035-01-01', cimaStatus: { estado: 1, psum: false, hasAlerts: false, comerc: true, notas: false, materialesInf: false } };
    expect(medicineSchema.parse(legacy).source).toBe('cima');
    expect(medicineSchema.safeParse({ ...legacy, source: 'custom' }).success).toBe(false);
    expect(medicineSchema.safeParse({ ...legacy, cimaStatus: null }).success).toBe(false);
    const manual = { ...legacy, ...custom, nregist: null, pactivos: null, formaOficial: null, dosisOficial: null, cimaStatus: null };
    expect(medicineSchema.safeParse(manual).success).toBe(true);
    expect(medicineSchema.safeParse({ ...manual, customDetails: undefined }).success).toBe(false);
    expect(medicineSchema.safeParse({ ...manual, cn: '123456' }).success).toBe(false);
  });

  it('accepts a custom product with unknown expiry and preserves declared strength separately', () => {
    expect(createMedicineSchema.parse(custom)).toMatchObject({ source: 'custom', nombre: 'Magnesio', threshold: 5, expDate: null, customDetails: { strength: '200 mg por cápsula' } });
  });

  it.each(['nregist', 'cimaStatus', 'formaOficial', 'dosisOficial', 'cn'])('rejects official field %s on custom products', (field) => {
    expect(createMedicineSchema.safeParse({ ...custom, [field]: '123456' }).success).toBe(false);
  });

  it('does not accept a missing source as a custom product, or an unknown source', () => {
    expect(createMedicineSchema.safeParse({ ...custom, source: undefined }).success).toBe(false);
    expect(createMedicineSchema.safeParse({ ...custom, source: 'verified' }).success).toBe(false);
  });

  it('keeps expiry mandatory for CIMA and validates custom identity and quantities', () => {
    expect(createMedicineSchema.safeParse({ nregist: '123456', stock: 1, stockUnit: 'pastillas', expDate: null }).success).toBe(false);
    expect(createMedicineSchema.safeParse({ ...custom, nombre: ' ' }).success).toBe(false);
    expect(createMedicineSchema.safeParse({ ...custom, stock: 0.1 }).success).toBe(false);
    expect(createMedicineSchema.safeParse({ ...custom, customDetails: { productType: 'unknown' } }).success).toBe(false);
  });
});
