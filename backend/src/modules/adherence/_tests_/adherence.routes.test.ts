import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { AdherenceLogModel } from '../../../models/adherenceLog.model';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('adherence.routes', () => {
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

  const createAdherenceContext = async (
    role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER',
    stock = 10,
  ) => {
    const user = await createUser(`a${Math.random().toString(16).slice(2, 8)}`);
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: `${Math.floor(Math.random() * 900000 + 100000)}`,
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      title: 'Tratamiento base',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 2,
          frequency: 8,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    return { user, blister, medicine, treatment };
  };

  it('lists paginated adherence logs', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext();

    await AdherenceLogModel.create([
      {
        blisterId: blister._id,
        medicineId: medicine._id,
        userId: user._id,
        treatmentId: treatment._id,
        amount: 1,
      },
      {
        blisterId: blister._id,
        medicineId: medicine._id,
        userId: user._id,
        treatmentId: treatment._id,
        amount: 1,
      },
    ]);

    const response = await request(app)
      .get(`/api/v1/blisters/${blister._id.toString()}/logs?page=1&limit=1`)
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

  it('creates adherence logs and updates stock for writer roles', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('CAREGIVER');

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      });

    const storedMedicine = await MedicineModel.findById(medicine._id);

    expect(response.status).toBe(201);
    expect(response.body.data.isForced).toBe(false);
    expect(storedMedicine?.stock).toBe(8);
  });

  it('returns 422 when stock is insufficient and force is not enabled', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER', 1);

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('ADHERENCE_STOCK_INSUFFICIENT');
  });

  it('allows forced logs when stock is insufficient', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER', 1);

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
        force: true,
        notes: 'Dose already taken',
      });

    const storedMedicine = await MedicineModel.findById(medicine._id);

    expect(response.status).toBe(201);
    expect(response.body.data.isForced).toBe(true);
    expect(response.body.data.amount).toBe(1);
    expect(storedMedicine?.stock).toBe(0);
  });

  it('blocks observer writes', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OBSERVER');

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('BLISTER_ROLE_FORBIDDEN');
  });

  it('undoes logs for their author and restores stock', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER');

    const createResponse = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      });

    const deleteResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/logs/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${createAccessToken(user._id.toString())}`);

    const storedMedicine = await MedicineModel.findById(medicine._id);
    const storedLog = await AdherenceLogModel.findById(createResponse.body.data.id);

    expect(deleteResponse.status).toBe(200);
    expect(storedMedicine?.stock).toBe(10);
    expect(storedLog).toBeNull();
  });

  it('blocks undo for users that are not the log author', async () => {
    const owner = await createUser('owner91');
    const caregiver = await createUser('care91');
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '911111',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      title: 'Tratamiento base',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 2,
          frequency: 8,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    const createResponse = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      });

    const deleteResponse = await request(app)
      .delete(`/api/v1/blisters/${blister._id.toString()}/logs/${createResponse.body.data.id}`)
      .set('Authorization', `Bearer ${createAccessToken(caregiver._id.toString())}`);

    expect(deleteResponse.status).toBe(403);
    expect(deleteResponse.body.error.code).toBe('ADHERENCE_LOG_AUTHOR_FORBIDDEN');
  });
});
