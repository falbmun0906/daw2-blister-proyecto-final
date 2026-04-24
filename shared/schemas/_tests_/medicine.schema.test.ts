import {
  createMedicineSchema,
  updateMedicineSchema,
} from '../medicine.schema';

describe('medicine shared schemas', () => {
  it('applies defaults and strips unknown fields on creation', () => {
    const parsed = createMedicineSchema.parse({
      nregist: '123456',
      nombre: ' Paracetamol ',
      alias: ' Paracetamol casa ',
      pactivos: ' Paracetamol ',
      formaOficial: ' COMPRIMIDO ',
      dosisOficial: ' 500 mg ',
      iconType: 'pill',
      stock: 12,
      stockUnit: 'pastillas',
      expDate: '2030-04-25T00:00:00.000Z',
      ignored: 'value',
    });

    expect(parsed.threshold).toBe(5);
    expect(parsed.nombre).toBe('Paracetamol');
    expect(parsed.alias).toBe('Paracetamol casa');
    expect('ignored' in parsed).toBe(false);
  });

  it('rejects invalid AEMPS registry values', () => {
    const result = createMedicineSchema.safeParse({
      nregist: 'ABC123',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 12,
      stockUnit: 'pastillas',
      expDate: '2030-04-25T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one field on medicine updates', () => {
    const result = updateMedicineSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
