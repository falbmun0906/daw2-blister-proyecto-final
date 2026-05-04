import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { AppointmentModel } from '../../../models/appointment.model';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('treatments.routes', () => {
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

  it('lists paginated treatments', async () => {
    const user = await createUser('81');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '820001',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });

    await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/treatments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Tratamiento A',
        patientUserId: user._id.toString(),
        medicines: [{ medicineId: medicine._id.toString(), amount: 1, firstDoseAt: '2030-11-02T08:00:00.000Z', frequencyHours: 8, isRecurring: true }],
        startDate: '2030-11-02T00:00:00.000Z',
      });
    await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/treatments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Tratamiento B',
        patientUserId: user._id.toString(),
        medicines: [{ medicineId: medicine._id.toString(), amount: 1, firstDoseAt: '2030-11-03T08:00:00.000Z', frequencyHours: 12, isRecurring: true }],
        startDate: '2030-11-03T00:00:00.000Z',
      });

    const response = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/treatments?page=1&limit=1`)
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

  it('creates treatments for writer roles', async () => {
    const user = await createUser('82');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'CAREGIVER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '820002',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '600 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/treatments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Dolor',
        patientUserId: user._id.toString(),
        medicines: [{ medicineId: medicine._id.toString(), amount: 1, firstDoseAt: '2030-11-02T08:00:00.000Z', frequencyHours: 8, isRecurring: true }],
        startDate: '2030-11-02T00:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Dolor');
  });

  it('blocks observer writes', async () => {
    const user = await createUser('83');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OBSERVER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '820003',
      nombre: 'Omeprazol',
      pactivos: 'Omeprazol',
      formaOficial: 'CAPSULA',
      dosisOficial: '20 mg',
      iconType: 'capsule',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/treatments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'No permitido',
        patientUserId: user._id.toString(),
        medicines: [{ medicineId: medicine._id.toString(), amount: 1, firstDoseAt: '2030-11-02T08:00:00.000Z', frequencyHours: 8, isRecurring: true }],
        startDate: '2030-11-02T00:00:00.000Z',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_ROLE_FORBIDDEN');
  });

  it('deletes treatments and unlinks related appointments', async () => {
    const user = await createUser('84');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '820004',
      nombre: 'Metformina',
      pactivos: 'Metformina',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '850 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });

    const createResponse = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/treatments`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        title: 'Diabetes',
        patientUserId: user._id.toString(),
        medicines: [{ medicineId: medicine._id.toString(), amount: 1, firstDoseAt: '2030-11-02T08:00:00.000Z', frequencyHours: 8, isRecurring: true }],
        startDate: '2030-11-02T00:00:00.000Z',
      });

    const appointment = await AppointmentModel.create({
      blisterId: blister._id,
      patientUserId: user._id,
      title: 'Revision',
      date: new Date('2030-11-04T10:00:00.000Z'),
      treatmentId: createResponse.body.data.id,
    });

    const deleteResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/treatments/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    const storedAppointment = await AppointmentModel.findById(appointment._id);

    expect(deleteResponse.status).toBe(200);
    expect(storedAppointment?.treatmentId).toBeNull();
  });
});
