import { Types } from 'mongoose';

import { MedicineModel } from '../medicine.model';
import { findSchemaIndex } from './schema-test.utils';

describe('MedicineModel', () => {
  it('applies defaults for threshold and CIMA status', () => {
    const medicine = new MedicineModel({
      blisterId: new Types.ObjectId(),
      nregist: '123456',
      nombre: 'Paracetamol',
      alias: 'Paracetamol casa',
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
    expect(medicine.alias).toBe('Paracetamol casa');
    expect(medicine.cimaStatus).toMatchObject({
      psum: false,
      estado: 1,
      hasAlerts: false,
      comerc: false,
      notas: false,
      materialesInf: false,
    });
  });

  it('declares a non-unique blister and nregist lookup index', () => {
    const index = findSchemaIndex(MedicineModel.schema.indexes(), { blisterId: 1, nregist: 1 });

    expect(index).toBeDefined();
    expect(index?.options.unique).toBeUndefined();
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
