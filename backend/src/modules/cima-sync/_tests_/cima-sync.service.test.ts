import { BlisterModel } from '../../../models/blister.model';
import { CimaChangeLogModel } from '../../../models/cimaChangeLog.model';
import { MedicineModel } from '../../../models/medicine.model';
import { NotificationModel } from '../../../models/notification.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import * as externalService from '../../external/external.service';
import {
  formatCimaSyncDate,
  getCimaSyncMeta,
  runCimaSyncJob,
  syncCimaFromRegistroCambios,
  updateCimaSyncMeta,
} from '../cima-sync.service';

describe('cima-sync.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
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

  const documentedCimaChangeCases = [
    {
      change: 'estado',
      nregist: '610001',
      severity: 'warning',
      title: 'Cambio en el estado de autorizacion',
    },
    {
      change: 'comerc',
      nregist: '610002',
      severity: 'warning',
      title: 'Cambio en la comercializacion',
    },
    {
      change: 'prosp',
      nregist: '610003',
      severity: 'info',
      title: 'Actualizacion de prospecto',
    },
    {
      change: 'ft',
      nregist: '610004',
      severity: 'info',
      title: 'Actualizacion de ficha tecnica',
    },
    {
      change: 'psum',
      nregist: '610005',
      severity: 'critical',
      title: 'Nuevo problema de suministro en CIMA',
    },
    {
      change: 'notasSeguridad',
      nregist: '610006',
      severity: 'critical',
      title: 'Nueva nota de seguridad en CIMA',
    },
    {
      change: 'matinf',
      nregist: '610007',
      severity: 'info',
      title: 'Actualizacion de materiales informativos',
    },
    {
      change: 'otros',
      nregist: '610008',
      severity: 'info',
      title: 'Cambio relevante en CIMA',
    },
  ] as const;

  it('reads and updates CIMA sync metadata preserving dd/mm/yyyy lastCimaSync', async () => {
    const today = formatCimaSyncDate(new Date('2026-04-26T10:00:00.000Z'));

    await updateCimaSyncMeta({
      lastCimaSync: today,
    });

    const meta = await getCimaSyncMeta();

    expect(meta.lastCimaSync).toBe(today);
  });

  it('updates metadata on syncs without changes', async () => {
    jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([]);

    await syncCimaFromRegistroCambios();

    const meta = await getCimaSyncMeta();
    const medicineCount = await MedicineModel.countDocuments({});
    const logCount = await CimaChangeLogModel.countDocuments({});

    expect(medicineCount).toBe(0);
    expect(logCount).toBe(0);
    expect(meta.lastRunAt).toBeInstanceOf(Date);
    expect(meta.lastSuccessAt).toBeInstanceOf(Date);
    expect(meta.lastCimaSync).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('creates logs, updates medicine cimaStatus and notifies owner and caregiver for critical changes', async () => {
    const owner = await createUser('cima-owner');
    const caregiver = await createUser('cima-care');
    const observer = await createUser('cima-observer');
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
      nregist: '123456',
      nombre: 'Paracetamol',
      pactivos: 'Paracetamol',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '500 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-01-01T00:00:00.000Z'),
    });

    jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([
      {
        nregistro: '123456',
        fecha: new Date('2026-04-26T10:00:00.000Z').getTime(),
        tipoCambio: 3,
        cambios: ['estado', 'psum', 'notasSeguridad'],
      },
    ]);
    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '123456',
      nombre: 'Paracetamol Actualizado',
      pactivos: 'Paracetamol',
      labtitular: 'Lab',
      formaOficial: 'COMPRIMIDO',
      formaSimplificada: 'COMPRIMIDO',
      dosisOficial: '650 mg',
      comerc: false,
      psum: true,
      notas: true,
      materialesInf: true,
      docs: [],
      fotos: [],
      atcs: [],
      principiosActivos: [],
      excipientes: [],
      viasAdministracion: [],
      cpresc: null,
      receta: false,
      fechaAutorizacion: null,
      conduc: false,
      triangulo: false,
      cimaStatus: {
        estado: 2,
        psum: true,
        hasAlerts: true,
        comerc: false,
        notas: true,
        materialesInf: true,
      },
    });

    await syncCimaFromRegistroCambios();

    const storedMedicine = await MedicineModel.findById(medicine._id);
    const logs = await CimaChangeLogModel.find({});
    const notifications = await NotificationModel.find({ type: 'cima_change' });

    expect(storedMedicine?.nombre).toBe('Paracetamol Actualizado');
    expect(storedMedicine?.cimaStatus).toMatchObject({
      estado: 2,
      psum: true,
      hasAlerts: true,
      comerc: false,
      notas: true,
      materialesInf: true,
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.tipoCambio).toBe('updated');
    expect(logs[0]?.cambios).toEqual(['estado', 'psum', 'notasSeguridad']);
    expect(notifications).toHaveLength(2);
    expect(notifications.every((item) => item.severity === 'critical')).toBe(true);
    expect(notifications.every((item) => item.userId.toString() !== observer._id.toString())).toBe(
      true,
    );
  });

  it.each(documentedCimaChangeCases)(
    'notifies documented CIMA registroCambios value $change',
    async ({ change, nregist, severity, title }) => {
      const owner = await createUser(`cima-${change}-owner`);
      const blister = await BlisterModel.create({
        name: 'Familia',
        members: [{ userId: owner._id, role: 'OWNER' }],
      });
      await MedicineModel.create({
        blisterId: blister._id,
        nregist,
        nombre: 'Medicamento CIMA',
        pactivos: 'Principio activo',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        iconType: 'pill',
        stock: 8,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      });

      jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([
        {
          nregistro: nregist,
          fecha: new Date('2026-04-26T10:00:00.000Z').getTime(),
          tipoCambio: 3,
          cambios: [change],
        },
      ]);
      jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
        nregist,
        nombre: 'Medicamento CIMA Actualizado',
        pactivos: 'Principio activo',
        labtitular: 'Lab',
        formaOficial: 'COMPRIMIDO',
        formaSimplificada: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        comerc: true,
        psum: change === 'psum',
        notas: change === 'notasSeguridad',
        materialesInf: change === 'matinf',
        docs: [],
        fotos: [],
        atcs: [],
        principiosActivos: [],
        excipientes: [],
        viasAdministracion: [],
        cpresc: null,
        receta: false,
        fechaAutorizacion: null,
        conduc: false,
        triangulo: false,
        cimaStatus: {
          estado: change === 'estado' ? 2 : 1,
          psum: change === 'psum',
          hasAlerts: change === 'psum' || change === 'notasSeguridad',
          comerc: true,
          notas: change === 'notasSeguridad',
          materialesInf: change === 'matinf',
        },
      });

      await syncCimaFromRegistroCambios();

      const notifications = await NotificationModel.find({ type: 'cima_change' });
      const logs = await CimaChangeLogModel.find({ nregist });

      expect(logs).toHaveLength(1);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.severity).toBe(severity);
      expect(notifications[0]?.title).toBe(title);
      expect(notifications[0]?.metadata?.cambios).toEqual([change]);
    },
  );

  it('creates low severity notifications for ficha tecnica or prospecto updates', async () => {
    const owner = await createUser('cima-ft-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    await MedicineModel.create({
      blisterId: blister._id,
      nregist: '222222',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '600 mg',
      iconType: 'pill',
      stock: 8,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-01-01T00:00:00.000Z'),
    });

    jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([
      {
        nregistro: '222222',
        fecha: new Date('2026-04-26T10:00:00.000Z').getTime(),
        tipoCambio: 3,
        cambios: ['ft'],
      },
    ]);
    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '222222',
      nombre: 'Ibuprofeno',
      pactivos: 'Ibuprofeno',
      labtitular: 'Lab',
      formaOficial: 'COMPRIMIDO',
      formaSimplificada: 'COMPRIMIDO',
      dosisOficial: '600 mg',
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
      receta: false,
      fechaAutorizacion: null,
      conduc: false,
      triangulo: false,
      cimaStatus: {
        estado: 1,
        psum: false,
        hasAlerts: false,
        comerc: true,
        notas: false,
        materialesInf: false,
      },
    });

    await syncCimaFromRegistroCambios();

    const notifications = await NotificationModel.find({ type: 'cima_change' });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.severity).toBe('info');
  });

  it('continues processing when one official medicine refresh fails', async () => {
    const owner = await createUser('cima-partial-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    await MedicineModel.create([
      {
        blisterId: blister._id,
        nregist: '333333',
        nombre: 'Uno',
        pactivos: 'Uno',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        iconType: 'pill',
        stock: 8,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        nregist: '444444',
        nombre: 'Dos',
        pactivos: 'Dos',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '20 mg',
        iconType: 'pill',
        stock: 8,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-01T00:00:00.000Z'),
      },
    ]);

    jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([
      {
        nregistro: '333333',
        fecha: new Date('2026-04-26T10:00:00.000Z').getTime(),
        tipoCambio: 3,
        cambios: ['estado'],
      },
      {
        nregistro: '444444',
        fecha: new Date('2026-04-26T11:00:00.000Z').getTime(),
        tipoCambio: 3,
        cambios: ['ft'],
      },
    ]);
    jest.spyOn(externalService, 'externalGetMedicineInfo').mockImplementation(async (nregist) => {
      if (nregist === '333333') {
        throw new Error('upstream fail');
      }

      return {
        nregist: '444444',
        nombre: 'Dos Actualizado',
        pactivos: 'Dos',
        labtitular: 'Lab',
        formaOficial: 'COMPRIMIDO',
        formaSimplificada: 'COMPRIMIDO',
        dosisOficial: '20 mg',
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
        receta: false,
        fechaAutorizacion: null,
        conduc: false,
        triangulo: false,
        cimaStatus: {
          estado: 1,
          psum: false,
          hasAlerts: false,
          comerc: true,
          notas: false,
          materialesInf: false,
        },
      };
    });

    await syncCimaFromRegistroCambios();

    const logs = await CimaChangeLogModel.find({});
    const secondMedicine = await MedicineModel.findOne({ nregist: '444444' });

    expect(logs).toHaveLength(2);
    expect(secondMedicine?.nombre).toBe('Dos Actualizado');
  });

  it('stores global errors in SystemMeta when the sync job fails', async () => {
    jest.spyOn(externalService, 'externalGetRegistroCambios').mockRejectedValue(
      new Error('CIMA service is currently unavailable.'),
    );

    await expect(runCimaSyncJob()).rejects.toThrow();

    const meta = await getCimaSyncMeta();

    expect(meta.lastErrorAt).toBeInstanceOf(Date);
    expect(meta.lastErrorMessage).toBe('CIMA service is currently unavailable.');
  });
});
