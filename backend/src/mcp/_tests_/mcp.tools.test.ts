import { Types } from 'mongoose';

import {
  appointmentCommentManagerInputSchema,
  appointmentManagerInputSchema,
  inventoryQueryInputSchema,
  medicineLookupInputSchema,
} from '../../../../shared/schemas';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { UserModel } from '../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../modules/auth/_tests_/auth-test.utils';
import { type McpAuthContext } from '../types';
import {
  appointmentCommentManagerTool,
  appointmentManagerTool,
  blisterListTool,
  blisterMembersTool,
  inventoryQueryTool,
  medicineLookupTool,
} from '../tools';

describe('MCP tools', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const createUser = async (suffix: string, name = `User ${suffix}`) =>
    UserModel.create({
      name,
      username: `mcpuser${suffix}`,
      email: `mcpuser${suffix}@example.com`,
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  const createMedicine = async (blisterId: Types.ObjectId, name: string, stock = 5) =>
    MedicineModel.create({
      blisterId,
      nregist: `${Math.floor(Math.random() * 900000) + 100000}`,
      nombre: name,
      alias: null,
      pactivos: 'Principio activo',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock,
      stockUnit: 'pastillas',
      threshold: 5,
      expDate: new Date('2030-12-01T00:00:00.000Z'),
      cimaStatus: {
        psum: false,
        estado: 1,
        hasAlerts: false,
      },
    });

  const createFixture = async () => {
    const currentUser = await createUser('current', 'Ana Observadora');
    const owner = await createUser('owner', 'Olivia Owner');
    const casita = await BlisterModel.create({
      name: 'Casita Blanca',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: currentUser._id, role: 'OBSERVER' },
      ],
    });
    const bosque = await BlisterModel.create({
      name: 'El Bosque',
      members: [{ userId: currentUser._id, role: 'OWNER' }],
    });
    const metformina = await createMedicine(casita._id, 'Metformina VIATRIS 1000 mg');
    const naproxeno = await createMedicine(bosque._id, 'Naproxeno NORMON 500 mg');
    const appointment = await AppointmentModel.create({
      blisterId: casita._id,
      patientUserId: owner._id,
      title: 'Revision endocrino',
      location: 'Centro de salud',
      description: 'Llevar analitica',
      date: new Date('2030-12-03T10:00:00.000Z'),
      comments: [
        {
          _id: new Types.ObjectId(),
          userId: owner._id,
          text: 'Preparar informe previo',
          createdAt: new Date('2030-11-01T10:00:00.000Z'),
          updatedAt: new Date('2030-11-01T10:00:00.000Z'),
        },
      ],
    });
    const context: McpAuthContext = {
      userId: currentUser._id.toString(),
      blisters: [
        {
          blisterId: casita._id.toString(),
          blisterName: casita.name,
          role: 'OBSERVER',
        },
        {
          blisterId: bosque._id.toString(),
          blisterName: bosque.name,
          role: 'OWNER',
        },
      ],
    };

    return { context, currentUser, owner, casita, bosque, metformina, naproxeno, appointment };
  };

  it('lists accessible blisters with the authenticated user real role', async () => {
    const { context } = await createFixture();

    const result = await blisterListTool.run(context, { includeMembers: false });

    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ blisterName: 'Casita Blanca', role: 'OBSERVER' }),
        expect.objectContaining({ blisterName: 'El Bosque', role: 'OWNER' }),
      ]),
    );
  });

  it('lists members and marks the current user without inferring ownership from other tools', async () => {
    const { context, owner } = await createFixture();

    const result = await blisterMembersTool.run(context, { blisterName: 'casita blanca' });

    expect(result.blister).toMatchObject({ blisterName: 'Casita Blanca', role: 'OBSERVER' });
    expect(result.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: context.userId, role: 'OBSERVER', isCurrentUser: true }),
        expect.objectContaining({ userId: owner._id.toString(), role: 'OWNER', isCurrentUser: false }),
      ]),
    );
  });

  it('scopes inventory queries by blisterName to avoid cross-blister medicine results', async () => {
    const { context, metformina, naproxeno } = await createFixture();
    const input = inventoryQueryInputSchema.parse({ blisterName: 'Casita Blanca' });

    const result = await inventoryQueryTool.run(context, input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(metformina._id.toString());
    expect(result.items[0].id).not.toBe(naproxeno._id.toString());
    expect(result.items[0].blisterName).toBe('Casita Blanca');
  });

  it('looks up medicines by text inside the requested blister only', async () => {
    const { context, naproxeno } = await createFixture();
    const input = medicineLookupInputSchema.parse({
      blisterName: 'El Bosque',
      text: 'naproxeno',
    });

    const result = await medicineLookupTool.run(context, input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe(naproxeno._id.toString());
    expect(result.items[0].blisterName).toBe('El Bosque');
  });

  it('returns appointment comments and blocks observer comment mutations', async () => {
    const { context, appointment } = await createFixture();
    const listInput = appointmentManagerInputSchema.parse({ blisterName: 'Casita Blanca' });
    const addCommentInput = appointmentCommentManagerInputSchema.parse({
      action: 'add',
      blisterName: 'Casita Blanca',
      appointmentId: appointment._id.toString(),
      text: 'No deberia permitirse',
    });

    const appointments = await appointmentManagerTool.run(context, listInput);

    expect(appointments.items).toHaveLength(1);
    expect(appointments.items[0].comments).toEqual([
      expect.objectContaining({ text: 'Preparar informe previo' }),
    ]);
    await expect(appointmentCommentManagerTool.run(context, addCommentInput)).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });
  });
});