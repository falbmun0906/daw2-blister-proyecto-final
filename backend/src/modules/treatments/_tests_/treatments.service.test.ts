import { Types } from 'mongoose';

import { AppointmentModel } from '../../../models/appointment.model';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import {
  treatmentsCreate,
  treatmentsDelete,
  treatmentsList,
  treatmentsUpdate,
} from '../treatments.service';

describe('treatments.service', () => {
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

  const createBlisterWithMedicine = async (role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER') => {
    const user = await createUser(`t${Math.random().toString(16).slice(2, 8)}`);
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '810001',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2030-10-01T00:00:00.000Z'),
    });

    return { user, blister, medicine };
  };

  const createIntervalMedicineEntry = (medicineId: string, firstDoseAt: string, frequencyHours: number) => ({
    medicineId,
    amount: 1,
    firstDoseAt: new Date(firstDoseAt),
    scheduleType: 'interval' as const,
    frequencyHours,
    dailyDoseTimes: [],
    isRecurring: true,
  });

  it('lists treatments with pagination metadata', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine();

    await treatmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Tratamiento A',
      patientUserId: user._id.toString(),
      medicines: [
        createIntervalMedicineEntry(medicine._id.toString(), '2030-10-02T08:00:00.000Z', 8),
      ],
      startDate: new Date('2030-10-02T00:00:00.000Z'),
    });
    await treatmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Tratamiento B',
      patientUserId: user._id.toString(),
      medicines: [
        createIntervalMedicineEntry(medicine._id.toString(), '2030-10-03T08:00:00.000Z', 12),
      ],
      startDate: new Date('2030-10-03T00:00:00.000Z'),
    });

    const result = await treatmentsList(blister._id.toString(), { page: 1, limit: 1 });

    expect(result.treatments).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('creates and updates treatments using medicines from the same blister', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine('CAREGIVER');

    const created = await treatmentsCreate(blister._id.toString(), 'CAREGIVER', {
      title: 'Hipertension',
      patientUserId: user._id.toString(),
      medicines: [
        createIntervalMedicineEntry(medicine._id.toString(), '2030-10-02T08:00:00.000Z', 8),
      ],
      startDate: new Date('2030-10-02T00:00:00.000Z'),
    });

    const updated = await treatmentsUpdate(
      blister._id.toString(),
      created.id,
      'CAREGIVER',
      {
        title: 'Hipertension ajustada',
        active: false,
      },
    );

    expect(created.title).toBe('Hipertension');
    expect(updated.title).toBe('Hipertension ajustada');
    expect(updated.active).toBe(false);
  });

  it('supports half doses and exact daily schedules', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine('OWNER');

    const created = await treatmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Mantenimiento',
      patientUserId: user._id.toString(),
      medicines: [
        {
          medicineId: medicine._id.toString(),
          amount: 0.5,
          firstDoseAt: new Date('2030-10-02T08:00:00.000Z'),
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: ['08:00', '20:30'],
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-10-02T00:00:00.000Z'),
    });

    expect(created.medicines[0]).toMatchObject({
      amount: 0.5,
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['08:00', '20:30'],
    });
  });

  it('clears the end date when the patch explicitly sends null', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine('CAREGIVER');

    const created = await treatmentsCreate(blister._id.toString(), 'CAREGIVER', {
      title: 'Tratamiento temporal',
      patientUserId: user._id.toString(),
      medicines: [
        createIntervalMedicineEntry(medicine._id.toString(), '2030-10-02T08:00:00.000Z', 8),
      ],
      startDate: new Date('2030-10-02T00:00:00.000Z'),
      endDate: new Date('2030-10-08T00:00:00.000Z'),
    });

    const updated = await treatmentsUpdate(
      blister._id.toString(),
      created.id,
      'CAREGIVER',
      {
        endDate: null,
      },
    );

    const storedTreatment = await TreatmentModel.findById(created.id);

    expect(updated.endDate).toBeNull();
    expect(storedTreatment?.endDate).toBeNull();
  });

  it('rejects medicines that do not belong to the blister', async () => {
    const { user, blister } = await createBlisterWithMedicine();
    const foreignMedicineId = new Types.ObjectId().toString();

    await expect(
      treatmentsCreate(blister._id.toString(), 'OWNER', {
        title: 'Invalido',
        patientUserId: user._id.toString(),
        medicines: [
          createIntervalMedicineEntry(foreignMedicineId, '2030-10-02T08:00:00.000Z', 8),
        ],
        startDate: new Date('2030-10-02T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'TREATMENT_MEDICINE_NOT_FOUND',
    });
  });

  it('blocks observer writes', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine('OBSERVER');

    await expect(
      treatmentsCreate(blister._id.toString(), 'OBSERVER', {
        title: 'No permitido',
        patientUserId: user._id.toString(),
        medicines: [
          createIntervalMedicineEntry(medicine._id.toString(), '2030-10-02T08:00:00.000Z', 8),
        ],
        startDate: new Date('2030-10-02T00:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });
  });

  it('archives treatments and unlinks related appointments', async () => {
    const { user, blister, medicine } = await createBlisterWithMedicine();
    const treatment = await treatmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Temporal',
      patientUserId: user._id.toString(),
      medicines: [
        createIntervalMedicineEntry(medicine._id.toString(), '2030-10-02T08:00:00.000Z', 8),
      ],
      startDate: new Date('2030-10-02T00:00:00.000Z'),
    });
    const appointment = await AppointmentModel.create({
      blisterId: blister._id,
      patientUserId: user._id,
      title: 'Revision',
      date: new Date('2030-10-03T10:00:00.000Z'),
      treatmentId: new Types.ObjectId(treatment.id),
    });

    await treatmentsDelete(blister._id.toString(), treatment.id, 'OWNER');

    const storedAppointment = await AppointmentModel.findById(appointment._id);
    const storedTreatment = await TreatmentModel.findById(treatment.id);
    const listed = await treatmentsList(blister._id.toString(), { page: 1, limit: 10 });

    expect(storedAppointment?.treatmentId).toBeNull();
    expect(storedTreatment?.active).toBe(false);
    expect(storedTreatment?.deletedAt).toBeInstanceOf(Date);
    expect(listed.treatments).toHaveLength(0);
  });
});
