import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { MedicineModel } from '../../../models/medicine.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { AdherenceLogModel } from '../../../models/adherenceLog.model';
import { treatmentsCreate, treatmentsDelete } from '../../treatments/treatments.service';
import { meUpcomingDoses } from '../../me/me.service';
import { createTreatmentSchema } from '../../../../../shared/schemas';
import { UserModel } from '../../../models/user.model';
import { NotificationModel } from '../../../models/notification.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import * as external from '../../external/external.service';
import { medicinesCreate, medicinesUpdate } from '../medicines.service';
import { migrateMedicineOrigins } from '../migrate-medicine-origins';
import { adherenceLogsCreate, adherenceLogsDelete } from '../../adherence/adherence.service';
import { medicineAddInputSchema, inventoryQueryInputSchema } from '../../../../../shared/schemas';
import {
  medicineAddTool,
  inventoryQueryTool,
  officialSourceLinkerTool,
  stockModifierTool,
} from '../../../mcp/tools';
import {
  notifyExpirationWarning,
  notifyExpirationWarningsForMedicines,
} from '../../notifications/notifications.service';

const input = {
  source: 'custom' as const,
  nombre: 'Magnesio',
  customDetails: {
    productType: 'supplement' as const,
    brand: 'Ejemplo',
    format: 'Cápsulas',
    strength: '200 mg por cápsula',
  },
  stock: 30,
  stockUnit: 'pastillas' as const,
  threshold: 5,
  expDate: null,
};
const app = createApp({ nodeEnv: 'test', mcpServerEnabled: false });

async function fixture(role: 'OWNER' | 'CAREGIVER' | 'OBSERVER' = 'OWNER') {
  const user = await UserModel.create({
    name: 'Ana Test',
    username: 'custom.test',
    email: 'custom@example.com',
    password: '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
    emailVerified: true,
  });
  const blister = await BlisterModel.create({
    name: 'Botiquín',
    members: [{ userId: user._id, role }],
  });
  const token = jwt.sign({ sub: user._id.toString(), type: 'access' }, env.jwtSecret, {
    expiresIn: '15m',
  });
  return { user, blister, token, url: `/api/v1/blisters/${blister._id}/medicines` };
}

describe('custom products across REST, stock and MCP', () => {
  beforeAll(connectTestDatabase);
  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });
  afterAll(disconnectTestDatabase);

  it('keeps dose and MCP names visible when an alias is omitted, cleared or legacy-empty', async () => {
    const { blister, user } = await fixture();
    const id = blister._id.toString();
    const medicine = await medicinesCreate(id, 'OWNER', { ...input, alias: '  ' });
    expect(medicine.alias).toBeNull();
    await medicinesUpdate(id, medicine.id, 'OWNER', { alias: 'Noche' });
    expect((await medicinesUpdate(id, medicine.id, 'OWNER', { alias: '' })).alias).toBeNull();
    await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: user._id,
      title: 'Pauta',
      startDate: new Date('2035-01-01'),
      medicines: [
        {
          medicineId: medicine.id,
          amount: 1,
          firstDoseAt: new Date('2035-01-01T08:00:00Z'),
          frequencyHours: 24,
          isRecurring: true,
        },
      ],
    });
    await MedicineModel.collection.updateOne(
      { _id: new Types.ObjectId(medicine.id) },
      { $set: { alias: '' } },
    );
    const upcoming = await meUpcomingDoses(user._id.toString(), {
      from: new Date('2035-01-01'),
      to: new Date('2035-01-02'),
      blisterId: id,
      includeTaken: true,
    });
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming[0].medicineName).toBe('Magnesio');
    const result = await stockModifierTool.run(
      {
        userId: user._id.toString(),
        blisters: [{ blisterId: id, blisterName: 'Botiquín', role: 'OWNER' }],
      },
      { blisterId: id, medicineId: medicine.id, mode: 'set', value: 20 },
    );
    expect(result.medicineName).toBe('Magnesio');
  });

  it('locks identity when assigned, preserves history and permits inventory corrections', async () => {
    const { blister, user } = await fixture();
    const id = blister._id.toString();
    const medicine = await medicinesCreate(id, 'OWNER', input);
    const timestamp = new Date('2035-01-01T08:00:00Z');
    const treatment = await treatmentsCreate(
      id,
      'OWNER',
      createTreatmentSchema.parse({
        patientUserId: user._id.toString(),
        title: 'Pauta',
        startDate: timestamp,
        medicines: [
          {
            medicineId: medicine.id,
            amount: 1,
            firstDoseAt: timestamp,
            frequencyHours: 24,
            isRecurring: true,
          },
        ],
      }),
    );
    const stale = await MedicineModel.findById(medicine.id);
    expect(stale.identityLocked).toBe(true);
    const log = await adherenceLogsCreate(id, user._id.toString(), 'OWNER', {
      medicineId: medicine.id,
      treatmentId: treatment.id,
      timestamp,
    });
    for (const patch of [
      { nombre: 'Melatonina' },
      { customDetails: { ...input.customDetails, strength: '10 mg' } },
    ]) {
      await expect(medicinesUpdate(id, medicine.id, 'OWNER', patch)).rejects.toMatchObject({
        code: 'MEDICINE_IDENTITY_LOCKED',
        statusCode: 409,
      });
    }
    const updated = await medicinesUpdate(id, medicine.id, 'OWNER', {
      nombre: input.nombre,
      customDetails: { ...input.customDetails, composition: '' },
      stock: 12,
      alias: '',
      expDate: null,
    });
    expect(updated).toMatchObject({ nombre: 'Magnesio', stock: 12, identityLocked: true });
    expect((await AdherenceLogModel.findById(log.id))?.medicineId.toString()).toBe(medicine.id);
    await treatmentsDelete(id, treatment.id, 'OWNER');
    await adherenceLogsDelete(id, log.id, user._id.toString());
    await expect(
      medicinesUpdate(id, medicine.id, 'OWNER', { nombre: 'Otro' }),
    ).rejects.toMatchObject({ code: 'MEDICINE_IDENTITY_LOCKED' });
  });

  it('invalidates an identity edit read before a concurrent treatment assignment', async () => {
    const { blister, user } = await fixture();
    const id = blister._id.toString();
    const medicine = await medicinesCreate(id, 'OWNER', input);
    const stale = await MedicineModel.findById(medicine.id);
    await treatmentsCreate(
      id,
      'OWNER',
      createTreatmentSchema.parse({
        patientUserId: user._id.toString(),
        title: 'Pauta',
        startDate: '2035-01-01',
        medicines: [
          {
            medicineId: medicine.id,
            amount: 1,
            firstDoseAt: '2035-01-01T08:00:00Z',
            frequencyHours: 24,
            isRecurring: true,
          },
        ],
      }),
    );
    stale.nombre = 'Melatonina';
    await expect(stale.save()).rejects.toMatchObject({ name: 'VersionError' });
    expect((await MedicineModel.findById(medicine.id))?.nombre).toBe('Magnesio');
  });

  it('creates and edits a caregiver product without calling CIMA or inventing official metadata', async () => {
    const { url, token } = await fixture('CAREGIVER');
    const official = jest.spyOn(external, 'externalGetMedicineInfo');
    const cn = jest.spyOn(external, 'externalGetMedicineInfoByCn');
    const created = await request(app)
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(input);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      source: 'custom',
      nregist: null,
      cimaStatus: null,
      expDate: null,
      formaOficial: null,
      dosisOficial: null,
      iconType: 'capsule',
    });
    const updated = await request(app)
      .patch(`${url}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Magnesio noche',
        customDetails: { ...input.customDetails, brand: 'Otra' },
        expDate: '2035-01-01',
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.nombre).toBe('Magnesio noche');
    const cleared = await request(app)
      .patch(`${url}/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ expDate: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.data.expDate).toBeNull();
    expect(official).not.toHaveBeenCalled();
    expect(cn).not.toHaveBeenCalled();
  });

  it('enforces writer permissions and blister isolation for custom creation and editing', async () => {
    const { url, token, user, blister } = await fixture('OBSERVER');
    expect(
      (await request(app).post(url).set('Authorization', `Bearer ${token}`).send(input)).status,
    ).toBe(403);
    const other = await BlisterModel.create({
      name: 'Otro',
      members: [{ userId: new Types.ObjectId(), role: 'OWNER' }],
    });
    const medicine = await medicinesCreate(other._id.toString(), 'OWNER', input);
    expect(
      (
        await request(app)
          .patch(`${url}/${medicine.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ stock: 2 })
      ).status,
    ).toBe(403);
    await BlisterModel.updateOne(
      { _id: blister._id },
      { $set: { members: [{ userId: user._id, role: 'OWNER' }] } },
    );
    expect(
      (
        await request(app)
          .patch(`${url}/${medicine.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ stock: 2 })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(url)
          .set('Authorization', `Bearer ${token}`)
          .send({ ...input, nregist: '123456' })
      ).status,
    ).toBe(400);
  });

  it('keeps official metadata immutable and known expiry mandatory for CIMA', async () => {
    const { blister } = await fixture();
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '123456',
      nombre: 'Oficial',
      pactivos: 'P',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '1 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2035-01-01'),
    });
    for (const update of [
      { nombre: 'Manual' },
      { customDetails: input.customDetails },
      { expDate: null },
    ]) {
      await expect(
        medicinesUpdate(blister._id.toString(), medicine._id.toString(), 'OWNER', update),
      ).rejects.toMatchObject({ code: 'OFFICIAL_MEDICINE_FIELDS' });
    }
  });

  it('deducts and restores the configured stock unit for a custom treatment', async () => {
    const { user, blister } = await fixture();
    const medicine = await medicinesCreate(blister._id.toString(), 'OWNER', input);
    const timestamp = new Date('2030-11-02T08:00:00Z');
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: user._id,
      title: 'Pauta introducida',
      startDate: timestamp,
      medicines: [
        {
          medicineId: medicine.id,
          amount: 1,
          firstDoseAt: timestamp,
          frequencyHours: 24,
          isRecurring: true,
        },
      ],
    });
    const log = await adherenceLogsCreate(blister._id.toString(), user._id.toString(), 'OWNER', {
      medicineId: medicine.id,
      treatmentId: treatment._id.toString(),
      timestamp,
    });
    expect((await MedicineModel.findById(medicine.id))?.stock).toBe(29);
    await adherenceLogsDelete(blister._id.toString(), log.id, user._id.toString());
    expect((await MedicineModel.findById(medicine.id))?.stock).toBe(30);
  });

  it('supports custom MCP creation and expiry filters without offering official links', async () => {
    const { user, blister } = await fixture();
    const context = {
      userId: user._id.toString(),
      blisters: [
        { blisterId: blister._id.toString(), blisterName: blister.name, role: 'OWNER' as const },
      ],
    };
    const result = await medicineAddTool.run(
      context,
      medicineAddInputSchema.parse({ ...input, blisterId: blister._id.toString() }),
    );
    expect(result.medicine).toMatchObject({
      source: 'custom',
      expDate: null,
      cimaStatus: null,
      cn: null,
      presentationName: null,
      captureMethod: 'manual',
    });
    const filtered = await inventoryQueryTool.run(
      context,
      inventoryQueryInputSchema.parse({ expirationState: 'expired' }),
    );
    expect(filtered.items).toHaveLength(0);
    await expect(
      officialSourceLinkerTool.run(context, { medicineId: result.medicine.id }),
    ).rejects.toMatchObject({ code: 'OFFICIAL_SOURCE_NOT_APPLICABLE' });
  });

  it('backfills legacy origins idempotently while preserving custom records', async () => {
    const { blister } = await fixture();
    const custom = await medicinesCreate(blister._id.toString(), 'OWNER', input);
    const legacy = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '123456',
      nombre: 'Oficial',
      pactivos: 'P',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '1 mg',
      iconType: 'pill',
      stock: 10,
      stockUnit: 'pastillas',
      threshold: 2,
      expDate: new Date('2035-01-01'),
    });
    await MedicineModel.collection.updateOne(
      { _id: legacy._id },
      { $unset: { source: '', captureMethod: '' } },
    );
    expect(await migrateMedicineOrigins()).toBe(1);
    expect(await migrateMedicineOrigins()).toBe(0);
    expect((await MedicineModel.findById(custom.id))?.source).toBe('custom');
  });

  it('allows multiple custom products when an old database still has the unique registry index', async () => {
    const { blister } = await fixture();
    await MedicineModel.collection.createIndex(
      { nregist: 1, blisterId: 1 },
      { name: 'nregist_1_blisterId_1', unique: true },
    );
    await medicinesCreate(blister._id.toString(), 'OWNER', input);
    const second = await medicinesCreate(blister._id.toString(), 'OWNER', {
      ...input,
      nombre: 'Melatonina',
    });
    expect(second.nombre).toBe('Melatonina');
    expect(await MedicineModel.countDocuments({ blisterId: blister._id })).toBe(2);
    expect(
      (await MedicineModel.collection.indexes()).some(
        (index) => index.name === 'nregist_1_blisterId_1',
      ),
    ).toBe(false);
  });

  it('does not generate expiry warnings for unknown dates and clears stale warnings after a correction', async () => {
    const { blister, user } = await fixture();
    const created = await medicinesCreate(blister._id.toString(), 'OWNER', input);
    const medicine = (await MedicineModel.findById(created.id))!;
    await notifyExpirationWarning(medicine, blister, '7d');
    await notifyExpirationWarningsForMedicines([medicine], blister);
    expect(await NotificationModel.countDocuments()).toBe(0);
    medicine.expDate = new Date('2035-01-01');
    await medicine.save();
    await notifyExpirationWarning(medicine, blister, '7d');
    expect(
      await NotificationModel.countDocuments({ userId: user._id, type: 'expiration_warning' }),
    ).toBe(1);
    await medicinesUpdate(blister._id.toString(), created.id, 'OWNER', { expDate: null });
    expect(await NotificationModel.countDocuments({ type: 'expiration_warning' })).toBe(0);
  });

  it('rejects a CN that CIMA resolves to a different registry before saving', async () => {
    const { blister } = await fixture();
    jest.spyOn(external, 'externalGetMedicineInfoByCn').mockResolvedValue({
      nregist: '99999',
    } as Awaited<ReturnType<typeof external.externalGetMedicineInfoByCn>>);
    await expect(
      medicinesCreate(blister._id.toString(), 'OWNER', {
        nregist: '12345',
        cn: '654321',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 5,
        expDate: new Date('2035-01-01'),
      }),
    ).rejects.toMatchObject({ code: 'MEDICINE_CODE_MISMATCH' });
    expect(await MedicineModel.countDocuments()).toBe(0);
  });
});
