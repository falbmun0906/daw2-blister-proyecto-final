import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('external.routes', () => {
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
      emailVerified: true,
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

  const setFetchResponse = (payload: unknown): void => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      ),
    });
  };

  it('requires JWT authentication for external search', async () => {
    const response = await request(app).get('/api/v1/external/search?q=paracetamol');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('proxies medicine search results from CIMA', async () => {
    const user = await createUser('51');
    setFetchResponse([
      {
        nregistro: '900001',
        nombre: 'Paracetamol',
        pactivos: 'Paracetamol',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/external/search?q=paracetamol')
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0].nregist).toBe('900001');
  });

  it('returns full medicine info for a valid nregist', async () => {
    const user = await createUser('52');
    setFetchResponse({
      nregistro: '900002',
      nombre: 'Amoxicilina',
      pactivos: 'Amoxicilina',
      formaFarmaceutica: {
        nombre: 'CAPSULA',
      },
      dosis: '500 mg',
      estado: {
        aut: 123,
      },
      docs: [],
      fotos: [{ url: 'https://example.test/photo' }],
      comerc: true,
    });

    const response = await request(app)
      .get('/api/v1/external/info/900002')
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data.nregist).toBe('900002');
    expect(response.body.data.fotos).toHaveLength(1);
  });
});
