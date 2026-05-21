import { Types } from 'mongoose';

import {
  adherenceLoggerInputSchema,
  appointmentCreateInputSchema,
  appointmentCommentManagerInputSchema,
  appointmentManagerInputSchema,
  inventoryQueryInputSchema,
  medicineAddInputSchema,
  medicineCatalogSearchInputSchema,
  medicineLookupInputSchema,
  scheduleAssistantInputSchema,
  treatmentLookupInputSchema,
} from '../../../../shared/schemas';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../modules/auth/_tests_/auth-test.utils';
import * as externalService from '../../modules/external/external.service';
import { type McpAuthContext } from '../types';
import {
  adherenceLoggerTool,
  appointmentCreateTool,
  appointmentCommentManagerTool,
  appointmentManagerTool,
  blisterListTool,
  blisterMembersTool,
  inventoryQueryTool,
  medicineAddTool,
  medicineCatalogSearchTool,
  medicineLookupTool,
  scheduleAssistantTool,
  treatmentLookupTool,
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

  const createMedicine = async (
    blisterId: Types.ObjectId,
    name: string,
    stock = 5,
    nregist = `${Math.floor(Math.random() * 900000) + 100000}`,
  ) =>
    MedicineModel.create({
      blisterId,
      nregist,
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

  const createTreatment = async (
    blisterId: Types.ObjectId,
    patientUserId: Types.ObjectId,
    title: string,
    medicineId: Types.ObjectId,
    dailyDoseTimes: string[] = ['15:30'],
  ) =>
    TreatmentModel.create({
      blisterId,
      patientUserId,
      title,
      description: null,
      timeZone: 'Europe/Madrid',
      startDate: new Date('2030-12-01T08:00:00.000Z'),
      endDate: null,
      active: true,
      medicines: [
        {
          medicineId,
          amount: 1,
          firstDoseAt: new Date('2030-12-01T08:00:00.000Z'),
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes,
          isRecurring: true,
          note: null,
        },
      ],
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

  it('searches official CIMA candidates by commercial name before adding a medicine', async () => {
    const { context, bosque } = await createFixture();
    await createMedicine(bosque._id, 'TRAMADOL CINFA 50 mg CAPSULAS DURAS EFG', 5, '910001');
    jest.spyOn(externalService, 'externalSearchMedicines').mockResolvedValue([
      {
        nregist: '910001',
        nombre: 'TRAMADOL CINFA 50 mg CAPSULAS DURAS EFG',
        pactivos: 'Tramadol hidrocloruro',
        labtitular: 'LABORATORIOS CINFA, S.A.',
        formaOficial: 'CAPSULA DURA',
        dosisOficial: '50 mg',
        fotoUrl: null,
      },
    ]);
    const input = medicineCatalogSearchInputSchema.parse({
      blisterName: 'El Bosque',
      commercialName: 'Tramadol',
    });

    const result = await medicineCatalogSearchTool.run(context, input);

    expect(result.items).toEqual([
      expect.objectContaining({
        nregist: '910001',
        nombre: 'TRAMADOL CINFA 50 mg CAPSULAS DURAS EFG',
        existingInTargetBlisters: 1,
      }),
    ]);
  });

  it('adds two equal CIMA medicines to the same blister through MCP', async () => {
    const { context, bosque } = await createFixture();
    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '910002',
      nombre: 'TRAMADOL CINFA 50 mg CAPSULAS DURAS EFG',
      pactivos: 'Tramadol hidrocloruro',
      labtitular: 'LABORATORIOS CINFA, S.A.',
      formaOficial: 'CAPSULA DURA',
      formaSimplificada: null,
      dosisOficial: '50 mg',
      comerc: true,
      psum: false,
      notas: false,
      materialesInf: false,
      docs: [],
      fotos: [],
      atcs: [],
      principiosActivos: [],
      excipientes: [],
      viasAdministracion: [],
      cpresc: null,
      receta: true,
      fechaAutorizacion: null,
      conduc: true,
      triangulo: true,
      cimaStatus: {
        estado: 1,
        psum: false,
        hasAlerts: false,
        comerc: true,
        notas: false,
        materialesInf: false,
      },
    });
    const firstInput = medicineAddInputSchema.parse({
      blisterName: 'El Bosque',
      nregist: '910002',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: '2031-02-01T00:00:00.000Z',
    });
    const secondInput = medicineAddInputSchema.parse({
      blisterName: 'El Bosque',
      nregist: '910002',
      alias: 'Caja nueva',
      stock: 30,
      stockUnit: 'pastillas',
      threshold: 5,
      expDate: '2031-08-01T00:00:00.000Z',
    });

    const first = await medicineAddTool.run(context, firstInput);
    const second = await medicineAddTool.run(context, secondInput);

    expect(first.medicine.id).not.toBe(second.medicine.id);
    expect(second.medicine.alias).toBe('Caja nueva');
    await expect(MedicineModel.countDocuments({ blisterId: bosque._id, nregist: '910002' })).resolves.toBe(2);
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

  it('creates appointments through MCP when the caller has writer role', async () => {
    const { context, currentUser, bosque } = await createFixture();
    const input = appointmentCreateInputSchema.parse({
      blisterName: 'El Bosque',
      patientUserId: currentUser._id.toString(),
      title: 'Consulta dermatologica',
      location: 'Centro medico',
      description: 'Revisar evolucion del tratamiento',
      date: '2031-04-10T09:30:00.000Z',
    });

    const result = await appointmentCreateTool.run(context, input);

    expect(result.appointment).toMatchObject({
      blisterId: bosque._id.toString(),
      blisterName: 'El Bosque',
      patientUserId: currentUser._id.toString(),
      title: 'Consulta dermatologica',
      location: 'Centro medico',
      description: 'Revisar evolucion del tratamiento',
      treatmentId: null,
    });
    await expect(AppointmentModel.countDocuments({ blisterId: bosque._id })).resolves.toBe(1);
  });

  it('creates MCP appointments from local civil time when a timezone is provided', async () => {
    const { context, currentUser, bosque } = await createFixture();
    const input = appointmentCreateInputSchema.parse({
      blisterName: 'El Bosque',
      patientUserId: currentUser._id.toString(),
      title: 'Consulta en horario local',
      date: '2031-07-10T18:00:00',
      timeZone: 'Europe/Madrid',
    });

    const result = await appointmentCreateTool.run(context, input);

    expect(result.appointment.date.toISOString()).toBe('2031-07-10T16:00:00.000Z');
    await expect(AppointmentModel.findOne({ blisterId: bosque._id, title: 'Consulta en horario local' }))
      .resolves.toMatchObject({ date: new Date('2031-07-10T16:00:00.000Z') });
  });

  it('returns schedule assistant doses using the treatment timezone', async () => {
    const { context, currentUser, bosque, naproxeno } = await createFixture();
    await TreatmentModel.create({
      blisterId: bosque._id,
      patientUserId: currentUser._id,
      title: 'Pauta matinal',
      timeZone: 'Europe/Madrid',
      startDate: new Date('2030-06-01T22:00:00.000Z'),
      active: true,
      medicines: [
        {
          medicineId: naproxeno._id,
          amount: 1,
          firstDoseAt: new Date('2030-06-01T22:00:00.000Z'),
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: ['10:00'],
          isRecurring: true,
        },
      ],
    });
    const input = scheduleAssistantInputSchema.parse({
      blisterName: 'El Bosque',
      from: '2030-06-02T08:00:00.000Z',
      to: '2030-06-02T08:30:00.000Z',
    });

    const result = await scheduleAssistantTool.run(context, input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].nextDoseAt.toISOString()).toBe('2030-06-02T08:00:00.000Z');
  });

  it('looks up active treatments by medicine text with schedules ready for MCP logging', async () => {
    const { context, currentUser, bosque } = await createFixture();
    const zinc = await createMedicine(bosque._id, 'Zinc Solaray', 10, '920001');
    const treatment = await createTreatment(
      bosque._id,
      currentUser._id,
      'Hierbas y suplementos',
      zinc._id,
      ['15:30'],
    );
    const input = treatmentLookupInputSchema.parse({
      blisterName: 'El Bosque',
      medicineText: 'zinc',
    });

    const result = await treatmentLookupTool.run(context, input);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      blisterName: 'El Bosque',
      treatmentId: treatment._id.toString(),
      title: 'Hierbas y suplementos',
    });
    expect(result.items[0].medicines).toEqual([
      expect.objectContaining({
        medicineId: zinc._id.toString(),
        medicineName: 'Zinc Solaray',
        dailyDoseTimes: ['15:30'],
      }),
    ]);
  });

  it('registers taken doses without treatmentId when the medicine belongs to a single active treatment', async () => {
    const { context, currentUser, bosque } = await createFixture();
    const zinc = await createMedicine(bosque._id, 'Zinc Solaray', 10, '920002');
    const treatment = await createTreatment(bosque._id, currentUser._id, 'Zinc diario', zinc._id, ['15:30']);
    const input = adherenceLoggerInputSchema.parse({
      blisterName: 'El Bosque',
      medicineId: zinc._id.toString(),
      status: 'taken',
    });

    const result = await adherenceLoggerTool.run(context, input);

    expect(result).toMatchObject({
      blisterId: bosque._id.toString(),
      medicineId: zinc._id.toString(),
      treatmentId: treatment._id.toString(),
      status: 'taken',
      isForced: false,
      stockAfter: 9,
      warning: null,
    });
    await expect(AdherenceLogModel.countDocuments({ blisterId: bosque._id })).resolves.toBe(1);
  });

  it('rejects adherence logs without treatmentId when multiple active treatments match the same medicine', async () => {
    const { context, currentUser, bosque } = await createFixture();
    const zinc = await createMedicine(bosque._id, 'Zinc Solaray', 10, '920003');
    await createTreatment(bosque._id, currentUser._id, 'Zinc desayuno', zinc._id, ['09:00']);
    await createTreatment(bosque._id, currentUser._id, 'Zinc comida', zinc._id, ['15:30']);
    const input = adherenceLoggerInputSchema.parse({
      blisterName: 'El Bosque',
      medicineId: zinc._id.toString(),
    });

    await expect(adherenceLoggerTool.run(context, input)).rejects.toMatchObject({
      code: 'MCP_TREATMENT_AMBIGUOUS',
    });
  });

  it('blocks appointment creation through MCP for observer role', async () => {
    const { context, owner } = await createFixture();
    const input = appointmentCreateInputSchema.parse({
      blisterName: 'Casita Blanca',
      patientUserId: owner._id.toString(),
      title: 'Consulta no autorizada',
      date: '2031-04-10T09:30:00.000Z',
    });

    await expect(appointmentCreateTool.run(context, input)).rejects.toMatchObject({
      code: 'BLISTER_ROLE_FORBIDDEN',
    });
  });
});