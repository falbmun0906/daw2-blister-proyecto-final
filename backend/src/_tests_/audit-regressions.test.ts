import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../app';
import { UserModel } from '../models/user.model';
import { BlisterModel } from '../models/blister.model';
import { MedicineModel } from '../models/medicine.model';
import { TreatmentModel } from '../models/treatment.model';
import { AdherenceLogModel } from '../models/adherenceLog.model';
import { AppointmentModel } from '../models/appointment.model';
import { NotificationModel } from '../models/notification.model';
import { PasswordResetTokenModel } from '../models/passwordResetToken.model';
import { resolveMcpContextFromToken } from '../mcp/context';
import { authCreateMcpToken, authDeleteAccount, authLogin, authRefresh, authResetPassword } from '../modules/auth/auth.service';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../modules/auth/_tests_/auth-test.utils';
import { blistersCreateInvite, blistersList, blistersUpdateMemberRole } from '../modules/blisters/blisters.service';
import { clearOAuthAuthorizationCodes, createAuthorizationCode, exchangeOAuthToken, registerOAuthClient, validateAuthorizeQuery } from '../modules/oauth/oauth.service';
import { treatmentsUpdate } from '../modules/treatments/treatments.service';
import { notifyUpcomingAppointmentReminders } from '../modules/notifications/notifications.service';
import { meUpcomingDoses } from '../modules/me/me.service';
import { computeDosesInRange } from '../utils/dose-schedule';
import { zonedTimeToDate } from '../utils/time-zone';
import { scheduleAssistantTool } from '../mcp/tools/schedule-assistant.tool';
import { assertPushEndpoint } from '../modules/notifications/push-endpoint';
import { scanExpirationWarnings } from '../modules/notifications/notifications-scheduler.service';
import { createTreatmentSchema } from '../../../shared/schemas/treatment.schema';

const password = 'Synthetic#123';
const verifier = 'a'.repeat(64);
const redirectUri = 'https://client.example/callback';
const app = createApp({ nodeEnv: 'test', clientOrigin: 'http://localhost:5173' });

describe('audit regressions with isolated MongoDB', () => {
  beforeAll(connectTestDatabase);
  afterEach(async () => { clearOAuthAuthorizationCodes(); await clearTestDatabase(); });
  afterAll(disconnectTestDatabase);

  const createUser = async (suffix: string) => UserModel.create({
    name: `Synthetic ${suffix}`, username: `synthetic${suffix}`, email: `${suffix}@example.com`,
    password: await bcrypt.hash(password, 4), emailVerified: true,
  });
  const createContext = async () => {
    const user = await createUser('owner');
    const blister = await BlisterModel.create({ name: 'Synthetic home', members: [{ userId: user._id, role: 'OWNER' }] });
    const medicine = await MedicineModel.create({
      blisterId: blister._id, nregist: '123456', nombre: 'Synthetic medicine', pactivos: 'Synthetic',
      formaOficial: 'SOLUCION', dosisOficial: '1 mg/ml', iconType: 'liquid',
      stock: 20, stockUnit: 'ml', threshold: 0, expDate: new Date('2035-01-01'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id, patientUserId: user._id, title: 'Synthetic treatment',
      startDate: new Date('2030-01-01'), timeZone: 'Europe/Madrid', active: true,
      medicines: [{ medicineId: medicine._id, amount: 2, firstDoseAt: new Date('2030-01-01T08:00:00Z'), frequencyHours: 8, isRecurring: true }],
    });
    return { user, blister, medicine, treatment };
  };
  const createGrant = async () => {
    const client = await registerOAuthClient({ client_name: 'Synthetic client', redirect_uris: [redirectUri] });
    const query = { client_id: client.client_id, redirect_uri: redirectUri, response_type: 'code', scope: 'mcp',
      code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') };
    const issueCode = async () => {
      const result = await createAuthorizationCode({ ...query, identifier: 'owner@example.com', password, consent: true });
      return new URL(result.redirectUri).searchParams.get('code')!;
    };
    const exchange = (code: string) => exchangeOAuthToken({ grant_type: 'authorization_code', client_id: client.client_id, redirect_uri: redirectUri, code, code_verifier: verifier });
    return { client, query, issueCode, exchange };
  };

  it('consumes each web and OAuth refresh token only once under concurrency', async () => {
    await createContext();
    const login = await authLogin({ identifier: 'owner@example.com', password });
    const web = await Promise.allSettled([authRefresh({ refreshToken: login.refreshToken }), authRefresh({ refreshToken: login.refreshToken })]);
    expect(web.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    const grant = await createGrant();
    const tokens = await grant.exchange(await grant.issueCode());
    const refresh = () => exchangeOAuthToken({ grant_type: 'refresh_token', client_id: grant.client.client_id, refresh_token: tokens.refresh_token });
    const oauth = await Promise.allSettled([refresh(), refresh()]);
    expect(oauth.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
  });

  it('reset invalidates REST, manual MCP, OAuth access/refresh and pending authorization codes', async () => {
    const { user } = await createContext();
    const login = await authLogin({ identifier: user.email, password });
    const manual = await authCreateMcpToken(user._id.toString(), {});
    const grant = await createGrant();
    const oauth = await grant.exchange(await grant.issueCode());
    const pending = await grant.issueCode();
    const resetToken = 'synthetic-reset-token';
    await PasswordResetTokenModel.create({ userId: user._id, tokenHash: createHash('sha256').update(resetToken).digest('hex'), expiresAt: new Date(Date.now() + 60_000) });
    await authResetPassword({ token: resetToken, password: 'Changed#123', confirmPassword: 'Changed#123' });
    expect((await request(app).get('/api/v1/blisters').set('Authorization', `Bearer ${login.accessToken}`)).status).toBe(401);
    await expect(authRefresh({ refreshToken: login.refreshToken })).rejects.toMatchObject({ statusCode: 401 });
    await expect(resolveMcpContextFromToken(manual.token)).rejects.toMatchObject({ statusCode: 401 });
    await expect(resolveMcpContextFromToken(oauth.access_token)).rejects.toMatchObject({ statusCode: 401 });
    await expect(exchangeOAuthToken({ grant_type: 'refresh_token', client_id: grant.client.client_id, refresh_token: oauth.refresh_token })).rejects.toMatchObject({ statusCode: 401 });
    await expect(grant.exchange(pending)).rejects.toMatchObject({ statusCode: 401 });
    await expect(authLogin({ identifier: user.email, password: 'Changed#123' })).resolves.toHaveProperty('accessToken');
  });

  it('binds unique client identifiers to exact callbacks', async () => {
    const grant = await createGrant();
    const second = await registerOAuthClient({ redirect_uris: [redirectUri] });
    expect(second.client_id).not.toBe(grant.client.client_id);
    await expect(validateAuthorizeQuery({ ...grant.query, redirect_uri: 'https://other.example/callback' })).rejects.toMatchObject({ code: 'OAUTH_REDIRECT_URI_INVALID' });
    await expect(validateAuthorizeQuery({ ...grant.query, client_id: 'unregistered-client' })).rejects.toMatchObject({ code: 'OAUTH_CLIENT_INVALID' });
  });

  it('shares the password attempt budget between REST login and OAuth', async () => {
    const grant = await createGrant();
    const ip = '203.0.113.240';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/oauth/authorize').set('X-Forwarded-For', ip).type('form')
        .send({ ...grant.query, identifier: 'unknown@example.com', password, consent: 'on' });
      expect(response.status).not.toBe(429);
    }
    const rest = await request(app).post('/api/v1/auth/login').set('X-Forwarded-For', ip).send({ identifier: 'unknown@example.com', password });
    expect(rest.status).toBe(429);
  });

  it('never exposes invitation secrets through common views and preserves an owner during concurrent demotions', async () => {
    const { user, blister } = await createContext();
    const other = await createUser('other');
    const observer = await createUser('observer');
    blister.members.push({ userId: other._id, role: 'OWNER' }, { userId: observer._id, role: 'OBSERVER' });
    await blister.save();
    const invite = await blistersCreateInvite(blister._id.toString(), user._id.toString(), { role: 'OWNER' });
    expect(invite.code).toBeTruthy();
    for (const member of [user, other, observer]) {
      const views = await blistersList(member._id.toString());
      expect(JSON.stringify(views)).not.toContain(invite.code);
    }
    const demotions = await Promise.allSettled([user, other].map((member) => blistersUpdateMemberRole(
      blister._id.toString(), member._id.toString(), member._id.toString(), { role: 'OBSERVER' },
    )));
    expect(demotions.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    expect((await BlisterModel.findById(blister._id))!.members.filter((member: { role: string }) => member.role === 'OWNER')).toHaveLength(1);
  });

  it('protects historical patient identity and revalidates archived references on reactivation', async () => {
    const { user, blister, medicine, treatment } = await createContext();
    const other = await createUser('other');
    blister.members.push({ userId: other._id, role: 'OBSERVER' });
    await blister.save();
    await AdherenceLogModel.create({ blisterId: blister._id, medicineId: medicine._id, treatmentId: treatment._id, userId: user._id, amount: 2, timestamp: new Date('2030-01-01T08:00:00Z') });
    await expect(treatmentsUpdate(blister._id.toString(), treatment._id.toString(), 'OWNER', { patientUserId: other._id.toString() })).rejects.toMatchObject({ code: 'TREATMENT_PATIENT_HAS_HISTORY' });
    await TreatmentModel.updateOne({ _id: treatment._id }, { $set: { active: false } });
    await MedicineModel.updateOne({ _id: medicine._id }, { $set: { deletedAt: new Date() } });
    await expect(treatmentsUpdate(blister._id.toString(), treatment._id.toString(), 'OWNER', { active: true })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('creates just one reminder per recipient when two schedulers run concurrently', async () => {
    const { user, blister } = await createContext();
    const reference = new Date('2030-01-01T12:00:00Z');
    await AppointmentModel.create({ blisterId: blister._id, patientUserId: user._id, title: 'Synthetic appointment', date: new Date('2030-01-01T13:00:00Z') });
    await Promise.all([notifyUpcomingAppointmentReminders(reference), notifyUpcomingAppointmentReminders(reference)]);
    expect(await NotificationModel.countDocuments({ type: 'appointment_reminder' })).toBe(1);
  });

  it('scans approaching expirations from the scheduler and catches a missed threshold day', async () => {
    const { medicine } = await createContext();
    medicine.expDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    await medicine.save();
    await scanExpirationWarnings();
    const notices = await NotificationModel.find({ type: 'expiration_warning' });
    expect(notices).toHaveLength(1);
    expect(notices[0].metadata?.level).toBe('7d');
  });

  it('deletes a patient history even when its treatment was already archived', async () => {
    const { user, blister, medicine, treatment } = await createContext();
    const caregiver = await createUser('caregiver');
    blister.members.push({ userId: caregiver._id, role: 'OWNER' });
    await blister.save();
    treatment.deletedAt = new Date();
    await treatment.save();
    await AdherenceLogModel.create({ blisterId: blister._id, treatmentId: treatment._id, medicineId: medicine._id, userId: caregiver._id, amount: 1, timestamp: new Date() });
    await authDeleteAccount(user._id.toString());
    expect(await AdherenceLogModel.countDocuments({ treatmentId: treatment._id })).toBe(0);
  });

  it('reports database readiness and bounds MCP bodies before dispatch', async () => {
    const { user } = await createContext();
    expect((await request(app).get('/api/v1/ready')).status).toBe(200);
    const manual = await authCreateMcpToken(user._id.toString(), {});
    const response = await request(app).post('/mcp').set('Authorization', `Bearer ${manual.token}`)
      .send({ jsonrpc: '2.0', id: 1, method: 'initialize', padding: 'x'.repeat(256 * 1024) });
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('MCP_BODY_TOO_LARGE');
  });

  it('exposes shifted DST time, unit and patient, and uses the same pending schedule through MCP', async () => {
    const { user, blister, medicine, treatment } = await createContext();
    treatment.medicines = [{ medicineId: medicine._id, amount: 2, firstDoseAt: new Date('2030-01-01'), scheduleType: 'daily_times', dailyDoseTimes: ['02:30'], frequencyHours: null, isRecurring: true }];
    await treatment.save();
    const from = new Date('2030-03-31T00:00:00Z');
    const to = new Date('2030-04-01T22:00:00Z');
    const doses = await meUpcomingDoses(user._id.toString(), { from, to, includeTaken: false });
    expect(doses[0]).toMatchObject({ doseAt: new Date('2030-03-31T01:30:00Z'), stockUnit: 'ml', scheduledTime: '02:30', displayTime: '03:30', isTimeAdjusted: true, patientUserId: user._id.toString() });
    await AdherenceLogModel.create({ blisterId: blister._id, treatmentId: treatment._id, medicineId: medicine._id, userId: user._id, amount: 2, timestamp: doses[0].doseAt });
    const manual = await authCreateMcpToken(user._id.toString(), {});
    const context = await resolveMcpContextFromToken(manual.token);
    const schedule = await scheduleAssistantTool.run(context, { from, to, lookAheadHours: 24 });
    expect(schedule.items[0]).toMatchObject({ nextDoseAt: new Date('2030-04-01T00:30:00Z'), stockUnit: 'ml' });
  });
});

describe('bounded calendar and external endpoints', () => {
  it('rejects duplicate medicine schedules in the shared contract', () => {
    const medicine = { medicineId: '507f1f77bcf86cd799439014', amount: 1, firstDoseAt: new Date('2030-01-01T08:00:00Z'), frequencyHours: 8, isRecurring: true };
    const result = createTreatmentSchema.safeParse({ title: 'Synthetic', patientUserId: '507f1f77bcf86cd799439011', startDate: new Date('2030-01-01'), medicines: [medicine, medicine] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path.join('.') === 'medicines.1.medicineId')).toBe(true);
  });
  it('shifts gaps forwards, picks the first folded time and refuses coincident doses', () => {
    expect(zonedTimeToDate('2026-03-29', '02:30', 'Europe/Madrid').toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(zonedTimeToDate('2026-10-25', '02:30', 'Europe/Madrid').toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(() => computeDosesInRange({ startDate: new Date('2026-03-01'), active: true, timeZone: 'Europe/Madrid' }, { firstDoseAt: new Date('2026-03-01'), scheduleType: 'daily_times', dailyDoseTimes: ['02:30', '03:30'], isRecurring: true }, new Date('2026-03-29'), new Date('2026-03-30'))).toThrow('hace coincidir');
  });
  it('does not truncate a month of three-hour doses at 200 entries', () => {
    const start = new Date('2030-10-01T00:00:00Z');
    const doses = computeDosesInRange({ startDate: start, active: true }, { firstDoseAt: start, frequencyHours: 3, isRecurring: true }, start, new Date('2030-10-31T23:59:59Z'));
    expect(doses).toHaveLength(248);
  });
  it('rejects local, credentialed, nonstandard-port and lookalike push destinations', () => {
    for (const endpoint of ['http://127.0.0.1/', 'https://127.0.0.1/', 'https://fcm.googleapis.com.evil.example/', 'https://user@fcm.googleapis.com/', 'https://fcm.googleapis.com:8443/']) {
      expect(() => assertPushEndpoint(endpoint)).toThrow();
    }
    expect(() => assertPushEndpoint('https://fcm.googleapis.com/fcm/send/synthetic')).not.toThrow();
  });
});
