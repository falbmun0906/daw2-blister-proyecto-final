import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('blisters.routes', () => {
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    nodeEnv: 'test',
  });

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

  it('lists authenticated blisters', async () => {
    const user = await createUser('12');
    await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });

    const response = await request(app)
      .get('/api/v1/blisters')
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('creates a blister for authenticated users', async () => {
    const user = await createUser('13');

    const response = await request(app)
      .post('/api/v1/blisters')
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        name: 'Casa Abuela',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe('Casa Abuela');
  });

  it('forbids non owners from updating blisters', async () => {
    const owner = await createUser('14');
    const observer = await createUser('15');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });

    const response = await request(app)
      .patch(`/api/v1/blisters/${blister._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(observer._id.toString())}`)
      .send({
        name: 'Renombrado',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_OWNER_REQUIRED');
  });

  it('joins a blister through a valid invite code', async () => {
    const owner = await createUser('16');
    const invited = await createUser('17');
    await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: owner._id, role: 'OWNER' }],
      inviteCode: {
        code: 'ABC123',
        exp: new Date(Date.now() + 60_000),
        role: 'CAREGIVER',
      },
    });

    const response = await request(app)
      .post('/api/v1/blisters/join')
      .set('Authorization', `Bearer ${createAccessToken(invited._id.toString())}`)
      .send({
        code: 'ABC123',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: invited._id.toString(),
          role: 'CAREGIVER',
        }),
      ]),
    );
  });

  it('creates a safety blister when removing a member from their only blister', async () => {
    const owner = await createUser('18');
    const member = await createUser('19');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: member._id, role: 'CAREGIVER' },
      ],
    });

    const response = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/members/${member._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    const memberBlisters = await BlisterModel.find({
      deletedAt: null,
      members: {
        $elemMatch: {
          userId: member._id,
        },
      },
    });

    expect(response.status).toBe(200);
    expect(memberBlisters).toHaveLength(1);
    expect(memberBlisters[0].name).toBe('Mi blíster');
  });

  it('blocks removing the last owner from a blister', async () => {
    const owner = await createUser('20');
    const caregiver = await createUser('21');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });

    const response = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/members/${owner._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('BLISTER_OWNER_PROTECTION');
  });
});
