import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('medicines.routes', () => {
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    nodeEnv: 'test',
  });

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

  const createAccessToken = (userId: string): string =>
    jwt.sign(
      {
        sub: userId,
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );

  const mockCimaInfoResponse = (nregist: string, formaOficial = 'COMPRIMIDO'): void => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation(async () =>
        new Response(
          JSON.stringify({
            nregistro: nregist,
            nombre: 'Paracetamol Kern',
            pactivos: 'Paracetamol',
            formaFarmaceutica: {
              nombre: formaOficial,
            },
            dosis: '500 mg',
            estado: {
              aut: 123456789,
            },
            psum: false,
            notas: false,
            docs: [
              {
                tipo: 1,
                url: 'https://cima.example/ft.pdf',
                secc: true,
              },
            ],
            fotos: [
              {
                url: 'https://cima.example/photo.jpg',
              },
            ],
            comerc: true,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      ),
    });
  };

  it('lists blister medicines with pagination metadata', async () => {
    const user = await createUser('41');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });

    await MedicineModel.create([
      {
        blisterId: blister._id,
        nregist: '100001',
        nombre: 'Aspirina',
        pactivos: 'Acido acetilsalicilico',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '500 mg',
        iconType: 'pill',
        stock: 8,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-06-01T00:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        nregist: '100002',
        nombre: 'Ibuprofeno',
        pactivos: 'Ibuprofeno',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '600 mg',
        iconType: 'pill',
        stock: 5,
        stockUnit: 'pastillas',
        threshold: 1,
        expDate: new Date('2030-06-02T00:00:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/medicines?page=1&limit=1`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('creates medicines using official CIMA data', async () => {
    const user = await createUser('42');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'CAREGIVER' }],
    });
    mockCimaInfoResponse('200001', 'CAPSULA');

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/medicines`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        nregist: '200001',
        alias: 'Resfriado',
        stock: 12,
        stockUnit: 'pastillas',
        threshold: 3,
        expDate: '2030-07-01T00:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.nombre).toBe('Paracetamol Kern');
    expect(response.body.data.iconType).toBe('capsule');
  });

  it('allows adding the same nregist twice in one blister', async () => {
    const user = await createUser('43');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });
    mockCimaInfoResponse('300001');

    await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/medicines`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        nregist: '300001',
        stock: 12,
        stockUnit: 'pastillas',
        threshold: 3,
        expDate: '2030-07-02T00:00:00.000Z',
      });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/medicines`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        nregist: '300001',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: '2030-07-03T00:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.nregist).toBe('300001');
    await expect(MedicineModel.countDocuments({ blisterId: blister._id, nregist: '300001' })).resolves.toBe(2);
  });

  it('blocks observer updates to medicines', async () => {
    const observer = await createUser('44');
    const owner = await createUser('45');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '400001',
      nombre: 'Metformina',
      pactivos: 'Metformina',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '850 mg',
      iconType: 'pill',
      stock: 30,
      stockUnit: 'pastillas',
      threshold: 5,
      expDate: new Date('2030-08-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/api/v1/blisters/${blister._id.toString()}/medicines/${medicine._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(observer._id.toString())}`)
      .send({
        stock: 25,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_ROLE_FORBIDDEN');
  });

  it('requires owner role to delete medicines', async () => {
    const owner = await createUser('46');
    const caregiver = await createUser('47');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '500001',
      nombre: 'Lorazepam',
      pactivos: 'Lorazepam',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '1 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-09-01T00:00:00.000Z'),
    });

    const forbiddenResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/medicines/${medicine._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(caregiver._id.toString())}`);

    const okResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/medicines/${medicine._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(forbiddenResponse.status).toBe(403);
    expect(okResponse.status).toBe(200);
  });
});
