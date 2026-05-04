import { Types } from 'mongoose';

import { AdherenceLogModel } from '../../../models/adherenceLog.model';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { NotificationModel } from '../../../models/notification.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import {
  adherenceLogsCreate,
  adherenceLogsDelete,
  adherenceLogsList,
} from '../adherence.service';

describe('adherence.service', () => {
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
      patientUserId: user._id,
      title: 'Tratamiento base',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 2,
          firstDoseAt: new Date('2030-11-02T08:00:00.000Z'),
          frequencyHours: 8,
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    return { user, blister, medicine, treatment };
  };

  it('lists adherence logs with pagination metadata', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext();

    await adherenceLogsCreate(blister._id.toString(), user._id.toString(), 'OWNER', {
      medicineId: medicine._id.toString(),
      treatmentId: treatment._id.toString(),
    });
    await adherenceLogsCreate(blister._id.toString(), user._id.toString(), 'OWNER', {
      medicineId: medicine._id.toString(),
      treatmentId: treatment._id.toString(),
      amount: 1,
    });

    const result = await adherenceLogsList(blister._id.toString(), { page: 1, limit: 1 });

    expect(result.logs).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('creates adherence logs and decrements stock for writer roles', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('CAREGIVER');

    const result = await adherenceLogsCreate(
      blister._id.toString(),
      user._id.toString(),
      'CAREGIVER',
      {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      },
    );

    const storedMedicine = await MedicineModel.findById(medicine._id);

    expect(result.isForced).toBe(false);
    expect(result.amount).toBe(2);
    expect(storedMedicine?.stock).toBe(8);
  });

  it('creates stock-low notifications for owner and caregiver when stock reaches threshold', async () => {
    const owner = await createUser(`o${Math.random().toString(16).slice(2, 8)}`);
    const caregiver = await createUser(`cg${Math.random().toString(16).slice(2, 8)}`);
    const observer = await createUser(`ob${Math.random().toString(16).slice(2, 8)}`);
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: `${Math.floor(Math.random() * 900000 + 100000)}`,
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '400 mg',
      iconType: 'pill',
      stock: 4,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Tratamiento umbral',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 2,
          firstDoseAt: new Date('2030-11-02T08:00:00.000Z'),
          frequencyHours: 8,
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    await adherenceLogsCreate(blister._id.toString(), caregiver._id.toString(), 'CAREGIVER', {
      medicineId: medicine._id.toString(),
      treatmentId: treatment._id.toString(),
    });

    const notifications = await NotificationModel.find({}).sort({ userId: 1 });

    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.type)).toEqual([
      'stock_low',
      'stock_low',
    ]);
    expect(notifications.map((notification) => notification.userId.toString()).sort()).toEqual(
      [caregiver._id.toString(), owner._id.toString()].sort(),
    );
  });

  it('requires force when stock would go below zero', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER', 1);

    await expect(
      adherenceLogsCreate(blister._id.toString(), user._id.toString(), 'OWNER', {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      }),
    ).rejects.toMatchObject({
      code: 'ADHERENCE_STOCK_INSUFFICIENT',
    });
  });

  it('allows forced logs and clamps stock to zero', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER', 1);

    const result = await adherenceLogsCreate(
      blister._id.toString(),
      user._id.toString(),
      'OWNER',
      {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
        force: true,
        notes: 'Dose taken but stock not updated yet',
      },
    );

    const storedMedicine = await MedicineModel.findById(medicine._id);

    expect(result.isForced).toBe(true);
    expect(result.amount).toBe(1);
    expect(storedMedicine?.stock).toBe(0);
  });

  it('creates forced-adherence and stock-depleted notifications for writer roles', async () => {
    const owner = await createUser(`fo${Math.random().toString(16).slice(2, 8)}`);
    const caregiver = await createUser(`fc${Math.random().toString(16).slice(2, 8)}`);
    const observer = await createUser(`fb${Math.random().toString(16).slice(2, 8)}`);
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: `${Math.floor(Math.random() * 900000 + 100000)}`,
      nombre: 'Amoxicilina',
      pactivos: 'Amoxicilina',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 1,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Tratamiento forzado',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 2,
          firstDoseAt: new Date('2030-11-02T08:00:00.000Z'),
          frequencyHours: 8,
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    await adherenceLogsCreate(blister._id.toString(), caregiver._id.toString(), 'CAREGIVER', {
      medicineId: medicine._id.toString(),
      treatmentId: treatment._id.toString(),
      force: true,
      notes: 'Se tomo la dosis aunque el stock estaba desactualizado',
    });

    const notifications = await NotificationModel.find({}).sort({ type: 1, userId: 1 });

    expect(notifications).toHaveLength(4);
    expect(
      notifications.filter((notification) => notification.type === 'adherence_forced'),
    ).toHaveLength(2);
    expect(
      notifications.filter((notification) => notification.type === 'stock_depleted'),
    ).toHaveLength(2);
    expect(
      notifications.every(
        (notification) => notification.userId.toString() !== observer._id.toString(),
      ),
    ).toBe(true);
  });

  it('blocks observer writes', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OBSERVER');

    await expect(
      adherenceLogsCreate(blister._id.toString(), user._id.toString(), 'OBSERVER', {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      }),
    ).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });
  });

  it('undoes logs by the same author and restores stock', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER');

    const created = await adherenceLogsCreate(
      blister._id.toString(),
      user._id.toString(),
      'OWNER',
      {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      },
    );

    await adherenceLogsDelete(blister._id.toString(), created.id, user._id.toString());

    const storedMedicine = await MedicineModel.findById(medicine._id);
    const storedLog = await AdherenceLogModel.findById(created.id);

    expect(storedMedicine?.stock).toBe(10);
    expect(storedLog).toBeNull();
  });

  it('rejects undo when requester is not the author', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER');
    const caregiver = await createUser(`c${Math.random().toString(16).slice(2, 8)}`);
    blister.members.push({
      userId: caregiver._id as Types.ObjectId,
      role: 'CAREGIVER',
    });
    await blister.save();

    const created = await adherenceLogsCreate(
      blister._id.toString(),
      user._id.toString(),
      'OWNER',
      {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      },
    );

    await expect(
      adherenceLogsDelete(blister._id.toString(), created.id, caregiver._id.toString()),
    ).rejects.toMatchObject({
      code: 'ADHERENCE_LOG_AUTHOR_FORBIDDEN',
    });
  });

  it('rejects undo when log is older than the allowed window', async () => {
    const { user, blister, medicine, treatment } = await createAdherenceContext('OWNER');

    const created = await adherenceLogsCreate(
      blister._id.toString(),
      user._id.toString(),
      'OWNER',
      {
        medicineId: medicine._id.toString(),
        treatmentId: treatment._id.toString(),
      },
    );

    await AdherenceLogModel.findByIdAndUpdate(created.id, {
      timestamp: new Date(Date.now() - (11 * 60 * 1000)),
    });

    await expect(
      adherenceLogsDelete(blister._id.toString(), created.id, user._id.toString()),
    ).rejects.toMatchObject({
      code: 'ADHERENCE_LOG_UNDO_WINDOW_EXPIRED',
    });
  });
});
