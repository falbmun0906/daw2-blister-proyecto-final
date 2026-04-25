import { Types } from 'mongoose';
import { BlisterModel } from '../../../models/blister.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import {
  appointmentsCreate,
  appointmentsDelete,
  appointmentsList,
  appointmentsUpdate,
} from '../appointments.service';

describe('appointments.service', () => {
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

  const createBlisterWithTreatment = async (role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER') => {
    const user = await createUser(`a${Math.random().toString(16).slice(2, 8)}`);
    const blister = await BlisterModel.create({
      name: 'Compartido',
      members: [{ userId: user._id, role }],
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      title: 'Base',
      medicines: [
        {
          medicineId: new Types.ObjectId(),
          amount: 1,
          frequency: 8,
        },
      ],
      startDate: new Date('2030-12-01T00:00:00.000Z'),
    });

    return { user, blister, treatment };
  };

  it('lists appointments with pagination metadata', async () => {
    const { blister } = await createBlisterWithTreatment();

    await appointmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Revision A',
      date: new Date('2030-12-02T10:00:00.000Z'),
    });
    await appointmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Revision B',
      date: new Date('2030-12-03T10:00:00.000Z'),
    });

    const result = await appointmentsList(blister._id.toString(), { page: 1, limit: 1 });

    expect(result.appointments).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('creates and updates appointments linked to treatments in the same blister', async () => {
    const { blister, treatment } = await createBlisterWithTreatment('CAREGIVER');

    const created = await appointmentsCreate(blister._id.toString(), 'CAREGIVER', {
      title: 'Cardiologia',
      date: new Date('2030-12-02T10:00:00.000Z'),
      treatmentId: treatment._id.toString(),
    });

    const updated = await appointmentsUpdate(
      blister._id.toString(),
      created.id,
      'CAREGIVER',
      {
        title: 'Cardiologia anual',
      },
    );

    expect(created.treatmentId).toBe(treatment._id.toString());
    expect(updated.title).toBe('Cardiologia anual');
  });

  it('rejects linked treatments from other blisters', async () => {
    const { blister } = await createBlisterWithTreatment();
    const { treatment } = await createBlisterWithTreatment();

    await expect(
      appointmentsCreate(blister._id.toString(), 'OWNER', {
        title: 'No valido',
        date: new Date('2030-12-02T10:00:00.000Z'),
        treatmentId: treatment._id.toString(),
      }),
    ).rejects.toMatchObject({
      code: 'APPOINTMENT_TREATMENT_NOT_FOUND',
    });
  });

  it('blocks observer writes', async () => {
    const { blister } = await createBlisterWithTreatment('OBSERVER');

    await expect(
      appointmentsCreate(blister._id.toString(), 'OBSERVER', {
        title: 'No permitido',
        date: new Date('2030-12-02T10:00:00.000Z'),
      }),
    ).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });
  });

  it('deletes appointments', async () => {
    const { blister } = await createBlisterWithTreatment();
    const appointment = await appointmentsCreate(blister._id.toString(), 'OWNER', {
      title: 'Revision',
      date: new Date('2030-12-02T10:00:00.000Z'),
    });

    await appointmentsDelete(blister._id.toString(), appointment.id, 'OWNER');

    const stored = await appointmentsList(blister._id.toString(), { page: 1, limit: 10 });
    expect(stored.appointments).toHaveLength(0);
  });
});
