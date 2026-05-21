import request from 'supertest';

import { createApp } from '../../../src/app';
import { BlisterModel } from '../../../src/models/blister.model';
import { MedicineModel } from '../../../src/models/medicine.model';
import { UserModel } from '../../../src/models/user.model';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';
import { env } from '../../../src/config/env';
import jwt from 'jsonwebtoken';

const app = createApp({
  clientOrigin: 'http://localhost:5173',
  nodeEnv: 'test',
});

describe('REST medicines e2e', () => {
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
      password: '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
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

  const mockCimaInfoResponse = (nregist: string): void => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            nregistro: nregist,
            nombre: 'Paracetamol Kern',
            pactivos: 'Paracetamol',
            formaFarmaceutica: { nombre: 'COMPRIMIDO' },
            dosis: '500 mg',
            estado: { aut: 1 },
            psum: false,
            notas: false,
            docs: [],
            fotos: [],
            comerc: true,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      ),
    });
  };

  it('creates medicines from CIMA and lists only medicines from the selected blister', async () => {
    const owner = await createUser('medicine-owner');
    const otherUser = await createUser('medicine-other');
    const blister = await BlisterModel.create({
      name: 'Inventario',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const foreignBlister = await BlisterModel.create({
      name: 'Ajeno',
      members: [{ userId: otherUser._id, role: 'OWNER' }],
    });
    void foreignBlister;

    mockCimaInfoResponse('100001');

    const createResponse = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/medicines`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        nregist: '100001',
        stock: 12,
        stockUnit: 'pastillas',
        threshold: 3,
        expDate: '2030-07-01T00:00:00.000Z',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.nombre).toBe('Paracetamol Kern');

    const listResponse = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/medicines?page=1&limit=20`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].blisterId).toBe(blister._id.toString());

    const forbiddenResponse = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/medicines?page=1&limit=20`)
      .set('Authorization', `Bearer ${createAccessToken(otherUser._id.toString())}`);

    expect(forbiddenResponse.status).toBe(403);
    expect(forbiddenResponse.body.error.code).toBe('BLISTER_ACCESS_FORBIDDEN');
  });

  it('updates stock through the REST service and blocks non members', async () => {
    const owner = await createUser('medicine-stock-owner');
    const outsider = await createUser('medicine-outsider');
    const blister = await BlisterModel.create({
      name: 'Stock',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '200001',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '600 mg',
      iconType: 'pill',
      stock: 4,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-08-01T00:00:00.000Z'),
    });

    const updateResponse = await request(app)
      .patch(`/api/v1/blisters/${blister._id.toString()}/medicines/${medicine._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        stock: 10,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.stock).toBe(10);

    const blockedResponse = await request(app)
      .patch(`/api/v1/blisters/${blister._id.toString()}/medicines/${medicine._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(outsider._id.toString())}`)
      .send({
        stock: 1,
      });

    expect(blockedResponse.status).toBe(403);
  });
});
