import request from 'supertest';

import { createApp } from '../../../src/app';
import { BlisterModel } from '../../../src/models/blister.model';
import { AdherenceLogModel } from '../../../src/models/adherenceLog.model';
import { MedicineModel } from '../../../src/models/medicine.model';
import { NotificationModel } from '../../../src/models/notification.model';
import { TreatmentModel } from '../../../src/models/treatment.model';
import { UserModel } from '../../../src/models/user.model';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';
import jwt from 'jsonwebtoken';
import { env } from '../../../src/config/env';

const app = createApp({
  clientOrigin: 'http://localhost:5173',
  nodeEnv: 'test',
});

describe('REST adherence and notifications e2e', () => {
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

  it('registers an adherence log, decrements stock and creates notifications', async () => {
    const owner = await createUser('adherence-owner');
    const caregiver = await createUser('adherence-caregiver');
    const observer = await createUser('adherence-observer');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '300001',
      nombre: 'Amlodipino',
      pactivos: 'Amlodipino',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '5 mg',
      iconType: 'pill',
      stock: 1,
      stockUnit: 'pastillas',
      threshold: 1,
      expDate: new Date('2030-09-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Hipertension',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 1,
          firstDoseAt: new Date('2030-01-01T08:00:00.000Z'),
          scheduleType: 'interval',
          frequencyHours: 24,
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-01-01T08:00:00.000Z'),
      endDate: null,
      active: true,
    });

    const response = await request(app)
      .post(`/api/v1/blisters/${blister._id.toString()}/logs`)
      .set('Authorization', `Bearer ${createAccessToken(caregiver._id.toString())}`)
      .send({
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
        force: false,
        notes: 'Toma de la mañana',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.isForced).toBe(false);

    const storedLog = await AdherenceLogModel.findOne({
      blisterId: blister._id,
      medicineId: medicine._id,
      treatmentId: treatment._id,
    });

    const storedMedicine = await MedicineModel.findById(medicine._id);
    const notifications = await NotificationModel.find({
      blisterId: blister._id,
      type: { $in: ['stock_low', 'stock_depleted'] },
    });

    expect(storedLog).toBeTruthy();
    expect(storedMedicine?.stock).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.some((item) => item.userId.toString() === observer._id.toString())).toBe(false);
  });

  it('lists and marks notifications as read', async () => {
    const owner = await createUser('notification-owner');
    const blister = await BlisterModel.create({
      name: 'Casa',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const notification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Aviso',
      message: 'Prueba',
    });

    const listResponse = await request(app)
      .get('/api/v1/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const readResponse = await request(app)
      .patch(`/api/v1/notifications/${notification._id.toString()}/read`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.data.isRead).toBe(true);
  });
});
