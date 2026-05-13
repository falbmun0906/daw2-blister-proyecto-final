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
import { meCalendar, meUpcomingDoses } from '../me.service';

describe('me.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const createContext = async () => {
    const user = await UserModel.create({
      name: 'Paciente Test',
      username: `metest${Math.random().toString(16).slice(2, 8)}`,
      email: `metest${Math.random().toString(16).slice(2, 8)}@example.com`,
      password: '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });
    const blister = await BlisterModel.create({
      name: 'Blister Test',
      members: [{ userId: user._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: `${Math.floor(Math.random() * 900000 + 100000)}`,
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '400 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-11-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: user._id,
      title: 'Tratamiento calendario',
      medicines: [
        {
          medicineId: medicine._id,
          amount: 1,
          firstDoseAt: new Date('2030-11-02T08:00:00.000Z'),
          frequencyHours: 8,
          isRecurring: true,
        },
      ],
      startDate: new Date('2030-11-02T00:00:00.000Z'),
    });

    return { user, blister, medicine, treatment };
  };

  it('returns registered doses when includeTaken is true', async () => {
    const { user, blister, medicine, treatment } = await createContext();
    const timestamp = new Date('2030-11-02T08:00:00.000Z');
    const log = await AdherenceLogModel.create({
      blisterId: blister._id,
      medicineId: medicine._id,
      treatmentId: treatment._id,
      userId: user._id,
      status: 'skipped',
      amount: 0,
      timestamp,
    });

    const result = await meUpcomingDoses(user._id.toString(), {
      from: new Date('2030-11-02T00:00:00.000Z'),
      to: new Date('2030-11-03T00:00:00.000Z'),
      includeTaken: true,
    });

    expect(result[0]).toMatchObject({
      isSkipped: true,
      adherenceLogId: log._id.toString(),
      amount: 1,
    });
    expect(result[0]?.adherenceCreatedAt).toBeInstanceOf(Date);
  });

  it('passes includeTaken through calendar dose queries', async () => {
    const { user, blister, medicine, treatment } = await createContext();
    await AdherenceLogModel.create({
      blisterId: blister._id,
      medicineId: medicine._id,
      treatmentId: treatment._id,
      userId: user._id,
      status: 'taken',
      amount: 1,
      timestamp: new Date('2030-11-02T08:00:00.000Z'),
    });

    const result = await meCalendar(user._id.toString(), {
      from: new Date('2030-11-02T00:00:00.000Z'),
      to: new Date('2030-11-03T00:00:00.000Z'),
      blisterId: blister._id.toString(),
      includeTaken: true,
      kinds: ['doses'],
    });

    expect(result.doses).toHaveLength(3);
    expect(result.doses[0]?.isTaken).toBe(true);
  });

  it('returns exact daily dose display time without applying client timezone twice', async () => {
    const { user, treatment } = await createContext();
    treatment.medicines = [
      {
        ...treatment.medicines[0],
        firstDoseAt: new Date('2030-11-02T00:02:00.000Z'),
        scheduleType: 'daily_times',
        frequencyHours: null,
        dailyDoseTimes: ['02:02', '04:05'],
        isRecurring: true,
      },
    ];
    await treatment.save();

    const result = await meUpcomingDoses(user._id.toString(), {
      from: new Date('2030-11-02T00:00:00.000Z'),
      to: new Date('2030-11-02T23:59:59.999Z'),
      includeTaken: true,
    });

    expect(result.map((dose) => dose.displayTime)).toEqual(['02:02', '04:05']);
  });
});
