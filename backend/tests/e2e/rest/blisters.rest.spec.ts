import request from 'supertest';

import { createApp } from '../../../src/app';
import { BlisterModel } from '../../../src/models/blister.model';
import { UserModel } from '../../../src/models/user.model';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';

const app = createApp({
  clientOrigin: 'http://localhost:5173',
  nodeEnv: 'test',
});

describe('REST blisters e2e', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
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
    require('jsonwebtoken').sign(
      {
        sub: userId,
        type: 'access',
      },
      require('../../../src/config/env').env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );

  it('creates a blister, joins by invite, updates roles and soft deletes it', async () => {
    const owner = await createUser('blister-owner');
    const caregiver = await createUser('blister-care');

    const createResponse = await request(app)
      .post('/api/v1/blisters')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        name: 'Casa Familiar',
      });

    expect(createResponse.status).toBe(201);
    const blisterId = createResponse.body.data._id as string;

    const inviteResponse = await request(app)
      .post(`/api/v1/blisters/${blisterId}/invite`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        role: 'CAREGIVER',
      });

    expect(inviteResponse.status).toBe(201);

    const joinResponse = await request(app)
      .post('/api/v1/blisters/join')
      .set('Authorization', `Bearer ${createAccessToken(caregiver._id.toString())}`)
      .send({
        code: inviteResponse.body.data.code,
      });

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.data.members).toHaveLength(2);

    const roleUpdateResponse = await request(app)
      .patch(`/api/v1/blisters/${blisterId}/members/${caregiver._id.toString()}/role`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        role: 'OBSERVER',
      });

    expect(roleUpdateResponse.status).toBe(200);
    expect(roleUpdateResponse.body.data.some((member: { userId: string; role: string }) => member.userId === caregiver._id.toString() && member.role === 'OBSERVER')).toBe(true);

    const deleteResponse = await request(app)
      .delete(`/api/v1/blisters/${blisterId}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(deleteResponse.status).toBe(200);

    const storedBlister = await BlisterModel.findById(blisterId);
    expect(storedBlister?.deletedAt).toBeInstanceOf(Date);

    const listResponse = await request(app)
      .get('/api/v1/blisters')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(0);
  });
});
