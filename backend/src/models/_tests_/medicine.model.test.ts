import { Types } from 'mongoose';

import { MedicineModel } from '../medicine.model';
import { findSchemaIndex } from './schema-test.utils';

describe('MedicineModel', () => {
  it('applies defaults for threshold and CIMA status', () => {
    const medicine = new MedicineModel({
      blisterId: new Types.ObjectId(),
      nregist: '123456',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      expDate: new Date('2027-04-24T00:00:00.000Z'),
    });

    expect(medicine.validateSync()).toBeUndefined();
    expect(medicine.threshold).toBe(5);
    expect(medicine.cimaStatus).toMatchObject({
      psum: false,
      estado: 1,
      hasAlerts: false,
    });
  });

  it('declares the unique blister and nregist compound index', () => {
    const index = findSchemaIndex(MedicineModel.schema.indexes(), { nregist: 1, blisterId: 1 });

    expect(index?.options.unique).toBe(true);
  });

  it('rejects non numeric AEMPS registry codes', () => {
    const medicine = new MedicineModel({
      blisterId: new Types.ObjectId(),
      nregist: 'ABC-123',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      expDate: new Date('2027-04-24T00:00:00.000Z'),
    });

    const validationError = medicine.validateSync();

    expect(validationError?.errors.nregist).toBeDefined();
  });
});
