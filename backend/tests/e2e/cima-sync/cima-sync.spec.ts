import { BlisterModel } from '../../../src/models/blister.model';
import { CimaChangeLogModel } from '../../../src/models/cimaChangeLog.model';
import { MedicineModel } from '../../../src/models/medicine.model';
import { NotificationModel } from '../../../src/models/notification.model';
import { SystemMetaModel } from '../../../src/models/systemMeta.model';
import { UserModel } from '../../../src/models/user.model';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';
import * as externalService from '../../../src/modules/external/external.service';
import { runCimaSyncJob } from '../../../src/modules/cima-sync/cima-sync.service';

describe('CIMA sync e2e', () => {
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
      password: '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  it('creates change logs, updates system meta and emits CIMA notifications', async () => {
    const owner = await createUser('sync-owner');
    const caregiver = await createUser('sync-care');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
      ],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '555555',
      nombre: 'Medicamento Base',
      pactivos: 'Activo',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '10 mg',
      iconType: 'pill',
      stock: 5,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2030-01-01T00:00:00.000Z'),
    });

    jest.spyOn(externalService, 'externalGetRegistroCambios').mockResolvedValue([
      {
        nregistro: '555555',
        fecha: new Date('2026-04-26T10:00:00.000Z').getTime(),
        tipoCambio: 3,
        cambios: ['estado', 'ft'],
      },
    ]);
    jest.spyOn(externalService, 'externalGetMedicineInfo').mockResolvedValue({
      nregist: '555555',
      nombre: 'Medicamento Actualizado',
      pactivos: 'Activo',
      labtitular: 'Lab',
      formaOficial: 'COMPRIMIDO',
      formaSimplificada: 'COMPRIMIDO',
      dosisOficial: '10 mg',
      comerc: true,
      psum: false,
      notas: false,
      materialesInf: false,
      docs: [],
      fotos: [],
      atcs: [],
      principiosActivos: [],
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

    await runCimaSyncJob();

    const storedMedicine = await MedicineModel.findById(medicine._id);
    const logs = await CimaChangeLogModel.find({ nregist: '555555' });
    const meta = await SystemMetaModel.findOne({ key: 'cimaSync' });
    const notifications = await NotificationModel.find({ blisterId: blister._id, type: 'cima_change' });

    expect(storedMedicine?.nombre).toBe('Medicamento Actualizado');
    expect(logs).toHaveLength(1);
    expect(meta).toBeTruthy();
    expect(notifications).toHaveLength(2);
  });
});
