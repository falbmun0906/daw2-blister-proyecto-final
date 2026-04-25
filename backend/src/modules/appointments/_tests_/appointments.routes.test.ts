import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { AppointmentModel } from '../../../models/appointment.model';
import { BlisterModel } from '../../../models/blister.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import { Types } from 'mongoose';

describe('appointments.routes', () => {
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

  it('lists paginated appointments', async () => {
    const user = await createUser('91');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });

    await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/appointments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Revision A',
        date: '2030-12-10T10:00:00.000Z',
      });
    await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/appointments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Revision B',
        date: '2030-12-11T10:00:00.000Z',
      });

    const response = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/appointments?page=1&limit=1`)
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

  it('creates appointments linked to treatments in the same blister', async () => {
    const user = await createUser('92');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'CAREGIVER' }],
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      title: 'Tratamiento base',
      medicines: [
        {
          medicineId: new Types.ObjectId(),
          amount: 1,
          frequency: 8,
        },
      ],
      startDate: new Date('2030-12-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/appointments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Cardiologia',
        date: '2030-12-10T10:00:00.000Z',
        treatmentId: treatment._id.toString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.treatmentId).toBe(treatment._id.toString());
  });

  it('blocks observer writes', async () => {
    const user = await createUser('93');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OBSERVER' }],
    });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/appointments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'No permitido',
        date: '2030-12-10T10:00:00.000Z',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_ROLE_FORBIDDEN');
  });

  it('deletes appointments', async () => {
    const user = await createUser('94');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });

    const createResponse = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/appointments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Traumatologia',
        date: '2030-12-10T10:00:00.000Z',
      });

    const deleteResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/appointments/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    const stored = await AppointmentModel.findById(createResponse.body.data.id);

    expect(deleteResponse.status).toBe(200);
    expect(stored).toBeNull();
  });
});
