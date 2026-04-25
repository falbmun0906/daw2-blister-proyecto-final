import { Types } from 'mongoose';

import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import * as externalService from '../../external/external.service';
import {
  medicinesCreate,
  medicinesDelete,
  medicinesList,
  medicinesUpdate,
} from '../medicines.service';

describe('medicines.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const createUser = async (suffix: string) =>
    UserModel.create({
      name: `User ${suffix}`,
      username: `user${suffix}`,
      email: `user${suffix}@example.com`,
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  const createBlister = async (userId: Types.ObjectId, role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER') =>
    BlisterModel.create({
      name: 'Botiquin compartido',
      members: [{ userId, role }],
    });

  it('lists medicines with pagination metadata', async () => {
    const user = await createUser('31');
    const blister = await createBlister(user._id);

    await MedicineModel.create([
      {
        blisterId: blister._id,
        nregist: '111111',
        nombre: 'Aspirina',
        pactivos: 'Acido acetilsalicilico',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '500 mg',
        iconType: 'pill',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        nregist: '222222',
        nombre: 'Zyrtec',
        pactivos: 'Cetirizina',
        formaOficial: 'SOLUCION',
        dosisOficial: '10 mg',
        iconType: 'liquid',
        stock: 5,
        stockUnit: 'ml',
        threshold: 1,
        expDate: new Date('2030-01-02T00:00:00.000Z'),
      },
    ]);

    const result = await medicinesList(blister._id.toString(), {
      page: 1,
      limit: 1,
    });

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0].nombre).toBe('Aspirina');
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('creates a medicine from official CIMA data and normalizes iconType', async () => {
    const user = await createUser('32');
    const blister = await createBlister(user._id, 'CAREGIVER');

    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '555555',
      nombre: 'Amoxicilina',
      pactivos: 'Amoxicilina',
      labtitular: 'Lab',
      formaOficial: 'capsula dura',
      formaSimplificada: null,
      dosisOficial: '500 mg',
      comerc: true,
      psum: false,
      notas: false,
      materialesInf: false,
      docs: [],
      fotos: [],
      atcs: [],
      principiosActivos: [],
      conduc: false,
      triangulo: false,
      cimaStatus: {
        estado: 1,
        psum: false,
        hasAlerts: false,
      },
    });

    const result = await medicinesCreate(blister._id.toString(), user._id.toString(), {
      nregist: '555555',
      alias: 'Antibiotico',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-02-01T00:00:00.000Z'),
    });

    expect(result.nombre).toBe('Amoxicilina');
    expect(result.iconType).toBe('capsule');
    expect(result.alias).toBe('Antibiotico');
  });

  it('returns a 409-style domain error when the blister already contains the same nregist', async () => {
    const user = await createUser('33');
    const blister = await createBlister(user._id);

    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '777777',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      labtitular: 'Lab',
      formaOficial: 'COMPRIMIDO',
      formaSimplificada: null,
      dosisOficial: '600 mg',
      comerc: true,
      psum: false,
      notas: false,
      materialesInf: false,
      docs: [],
      fotos: [],
      atcs: [],
      principiosActivos: [],
      conduc: false,
      triangulo: false,
      cimaStatus: {
        estado: 1,
        psum: false,
        hasAlerts: false,
      },
    });

    await medicinesCreate(blister._id.toString(), user._id.toString(), {
      nregist: '777777',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-03-01T00:00:00.000Z'),
    });

    await expect(
      medicinesCreate(blister._id.toString(), user._id.toString(), {
        nregist: '777777',
        stock: 15,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-03-02T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'MEDICINE_DUPLICATE',
    });
  });

  it('updates stock and alias for writer roles', async () => {
    const user = await createUser('34');
    const blister = await createBlister(user._id, 'CAREGIVER');
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '888888',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '1 g',
      iconType: 'pill',
      stock: 4,
      stockUnit: 'pastillas',
      threshold: 1,
      expDate: new Date('2030-04-01T00:00:00.000Z'),
    });

    const result = await medicinesUpdate(
      blister._id.toString(),
      medicine._id.toString(),
      user._id.toString(),
      {
        alias: 'Dolor',
        stock: 12,
        threshold: 5,
      },
    );

    expect(result.alias).toBe('Dolor');
    expect(result.stock).toBe(12);
    expect(result.threshold).toBe(5);
  });

  it('requires owner role to delete medicines', async () => {
    const caregiver = await createUser('35');
    const owner = await createUser('36');
    const blister = await BlisterModel.create({
      name: 'Botiquin compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '999999',
      nombre: 'Omeprazol',
      pactivos: 'Omeprazol',
      formaOficial: 'CAPSULA',
      dosisOficial: '20 mg',
      iconType: 'capsule',
      stock: 14,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-05-01T00:00:00.000Z'),
    });

    await expect(
      medicinesDelete(blister._id.toString(), medicine._id.toString(), caregiver._id.toString()),
    ).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });

    await medicinesDelete(blister._id.toString(), medicine._id.toString(), owner._id.toString());

    const stored = await MedicineModel.findById(medicine._id);
    expect(stored).toBeNull();
  });
});
