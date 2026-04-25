import express, {
  type Request,
  type Response,
} from 'express';
import request from 'supertest';

import { BlisterModel } from '../../models/blister.model';
import { UserModel } from '../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../modules/auth/_tests_/auth-test.utils';
import { errorMiddleware } from '../error.middleware';
import { checkBlisterAccess } from '../checkBlisterAccess';

describe('checkBlisterAccess middleware', () => {
  const app = express();

  app.use((req: Request, _res: Response, next) => {
    (req as Request & { auth: { userId: string } }).auth = {
      userId: req.header('x-user-id') ?? '',
    };

    next();
  });

  app.get('/blisters/:blisterId/test', checkBlisterAccess, (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        blisterRole: res.locals.blisterRole,
      },
    });
  });
  app.use(errorMiddleware);

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
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  it('injects the member role in response locals', async () => {
    const user = await createUser('71');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'CAREGIVER' }],
    });

    const response = await request(app)
      .get(`/blisters/${blister._id.toString()}/test`)
      .set('x-user-id', user._id.toString());

    expect(response.status).toBe(200);
    expect(response.body.data.blisterRole).toBe('CAREGIVER');
  });

  it('returns 404 when the blister does not exist', async () => {
    const user = await createUser('72');

    const response = await request(app)
      .get('/blisters/507f1f77bcf86cd799439011/test')
      .set('x-user-id', user._id.toString());

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('BLISTER_NOT_FOUND');
  });

  it('returns 403 when the user does not belong to the blister', async () => {
    const owner = await createUser('73');
    const stranger = await createUser('74');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });

    const response = await request(app)
      .get(`/blisters/${blister._id.toString()}/test`)
      .set('x-user-id', stranger._id.toString());

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_ACCESS_FORBIDDEN');
  });
});
