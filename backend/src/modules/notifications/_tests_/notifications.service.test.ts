import { BlisterModel } from '../../../models/blister.model';
import { AdherenceLogModel } from '../../../models/adherenceLog.model';
import { AppointmentModel } from '../../../models/appointment.model';
import { MedicineModel } from '../../../models/medicine.model';
import { NotificationModel } from '../../../models/notification.model';
import { PushSubscriptionModel } from '../../../models/pushSubscription.model';
import { TreatmentModel } from '../../../models/treatment.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';
import {
  notificationsDelete,
  notificationsList,
  notificationsMarkAsRead,
  notifyDueDoseReminders,
  notifyExpirationWarningsForMedicines,
  notifyUpcomingAppointmentReminders,
} from '../notifications.service';
import {
  notificationsPushConfig,
  notificationsPushSubscribe,
  notificationsPushSubscriptionsList,
  notificationsPushUnsubscribe,
} from '../notifications-push.service';

describe('notifications.service', () => {
  let userCounter = 0;

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
      username: `u${++userCounter}${suffix}`.slice(0, 30),
      email: `user${suffix}@example.com`,
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      emailVerified: true,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  it('lists notifications for the authenticated user with pagination metadata', async () => {
    const owner = await createUser('notify-list-owner');
    const otherUser = await createUser('notify-list-other');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });

    await NotificationModel.create([
      {
        userId: owner._id,
        blisterId: blister._id,
        type: 'system',
        severity: 'info',
        title: 'Primera',
        message: 'Primera notificacion',
        createdAt: new Date('2030-01-02T10:00:00.000Z'),
      },
      {
        userId: owner._id,
        blisterId: blister._id,
        type: 'stock_low',
        severity: 'warning',
        title: 'Segunda',
        message: 'Segunda notificacion',
        createdAt: new Date('2030-01-03T10:00:00.000Z'),
      },
      {
        userId: otherUser._id,
        blisterId: blister._id,
        type: 'system',
        severity: 'info',
        title: 'Ajena',
        message: 'No debe aparecer',
        createdAt: new Date('2030-01-04T10:00:00.000Z'),
      },
    ]);

    const result = await notificationsList(owner._id.toString(), { page: 1, limit: 1 });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]?.title).toBe('Segunda');
    expect(result.meta).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it('auto-dismisses expired pre-appointment reminders when listing the inbox', async () => {
    const owner = await createUser('notify-expired-appointment-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const expiredReminder = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'appointment_reminder',
      severity: 'info',
      title: 'Cita médica próxima',
      message: 'Tienes Revisión anual en menos de 3 horas.',
      metadata: {
        appointmentId: 'appointment-expired',
        appointmentDate: '2000-01-01T10:00:00.000Z',
        reminderPhase: 'before',
      },
    });
    await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'appointment_reminder',
      severity: 'info',
      title: '¿Qué tal ha ido la cita?',
      message: "Tras la cita 'Revisión anual', revisa si hay cambios que aplicar al tratamiento.",
      metadata: {
        appointmentId: 'appointment-follow-up',
        appointmentTitle: 'Revisión anual',
        appointmentDate: '2000-01-01T10:00:00.000Z',
        reminderPhase: 'after',
      },
    });

    const result = await notificationsList(owner._id.toString(), { page: 1, limit: 20 });
    const storedExpiredReminder = await NotificationModel.findById(expiredReminder._id);

    expect(storedExpiredReminder?.dismissedAt).toBeInstanceOf(Date);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]?.title).toBe('¿Qué tal ha ido la cita?');
  });

  it('marks only the owner notification as read', async () => {
    const owner = await createUser('notify-read-owner');
    const otherUser = await createUser('notify-read-other');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: otherUser._id, role: 'CAREGIVER' },
      ],
    });
    const notification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Sistema',
      message: 'Se ha actualizado la bandeja',
    });

    const result = await notificationsMarkAsRead(
      notification._id.toString(),
      owner._id.toString(),
    );

    const storedNotification = await NotificationModel.findById(notification._id);

    expect(result.isRead).toBe(true);
    expect(storedNotification?.isRead).toBe(true);
  });

  it('deletes read notifications for the authenticated user without touching other inboxes', async () => {
    const owner = await createUser('notify-delete-owner');
    const otherUser = await createUser('notify-delete-other');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: otherUser._id, role: 'CAREGIVER' },
      ],
    });
    const ownerNotification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Leida',
      message: 'Se descarta desde la bandeja',
      isRead: true,
    });
    const otherNotification = await NotificationModel.create({
      userId: otherUser._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Ajena',
      message: 'Debe permanecer',
      isRead: true,
    });

    await notificationsDelete(ownerNotification._id.toString(), owner._id.toString());

    const storedOwnerNotification = await NotificationModel.findById(ownerNotification._id);
    const listed = await notificationsList(owner._id.toString(), { page: 1, limit: 20 });

    expect(storedOwnerNotification).toMatchObject({
      dismissedAt: expect.any(Date),
    });
    expect(await NotificationModel.findById(otherNotification._id)).not.toBeNull();
    expect(listed.notifications).toHaveLength(0);
  });

  it('returns not found when trying to mark another user notification as read', async () => {
    const owner = await createUser('notify-404-owner');
    const otherUser = await createUser('notify-404-other');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: otherUser._id, role: 'CAREGIVER' },
      ],
    });
    const notification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Privada',
      message: 'Solo visible para owner',
    });

    await expect(
      notificationsMarkAsRead(notification._id.toString(), otherUser._id.toString()),
    ).rejects.toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('creates expiration warning notifications for every threshold and blister member', async () => {
    const owner = await createUser('notify-exp-owner');
    const caregiver = await createUser('notify-exp-caregiver');
    const observer = await createUser('notify-exp-observer');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const referenceDate = new Date('2030-01-01T10:00:00.000Z');
    const medicines = await MedicineModel.create([
      {
        blisterId: blister._id,
        nregist: '910030',
        nombre: 'Medicina 30',
        pactivos: 'Principio 30',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        iconType: 'pill',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-31T00:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        nregist: '910015',
        nombre: 'Medicina 15',
        pactivos: 'Principio 15',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        iconType: 'pill',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-16T00:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        nregist: '910007',
        nombre: 'Medicina 7',
        pactivos: 'Principio 7',
        formaOficial: 'COMPRIMIDO',
        dosisOficial: '10 mg',
        iconType: 'pill',
        stock: 10,
        stockUnit: 'pastillas',
        threshold: 2,
        expDate: new Date('2030-01-08T00:00:00.000Z'),
      },
    ]);

    await notifyExpirationWarningsForMedicines(medicines, blister, referenceDate);

    const notifications = await NotificationModel.find({ type: 'expiration_warning' });
    const recipientIds = new Set(notifications.map((item) => item.userId.toString()));

    expect(notifications).toHaveLength(9);
    expect(recipientIds).toEqual(
      new Set([owner._id.toString(), caregiver._id.toString(), observer._id.toString()]),
    );
    expect(notifications.filter((item) => item.metadata?.level === '30d')).toHaveLength(3);
    expect(notifications.filter((item) => item.metadata?.level === '15d')).toHaveLength(3);
    expect(notifications.filter((item) => item.metadata?.level === '7d')).toHaveLength(3);
    expect(
      notifications
        .filter((item) => item.metadata?.level === '7d')
        .every((item) => item.severity === 'critical'),
    ).toBe(true);
  });

  it('creates before and after appointment reminders with follow-up copy', async () => {
    const owner = await createUser('notify-appointment-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const referenceDate = new Date('2030-01-01T12:15:00.000Z');
    await AppointmentModel.create([
      {
        blisterId: blister._id,
        patientUserId: owner._id,
        title: 'Consulta cardiologia',
        date: new Date('2030-01-01T15:00:00.000Z'),
      },
      {
        blisterId: blister._id,
        patientUserId: owner._id,
        title: 'Consulta digestivo',
        date: new Date('2030-01-01T12:00:00.000Z'),
      },
    ]);

    await notifyUpcomingAppointmentReminders(referenceDate);

    const notifications = await NotificationModel.find({ type: 'appointment_reminder' });
    const before = notifications.find((item) => item.metadata?.reminderPhase === 'before');
    const after = notifications.find((item) => item.metadata?.reminderPhase === 'after');

    expect(notifications).toHaveLength(2);
    expect(before?.title).toBe('Cita médica próxima');
    expect(before?.message).toBe('Tienes Consulta cardiologia en menos de 3 horas.');
    expect(before?.metadata?.appointmentTitle).toBe('Consulta cardiologia');
    expect(after?.title).toBe('¿Qué tal ha ido la cita?');
    expect(after?.message).toBe("Tras la cita 'Consulta digestivo', revisa si hay cambios que aplicar al tratamiento.");
    expect(after?.metadata?.appointmentTitle).toBe('Consulta digestivo');
  });

  it('does not recreate dismissed appointment reminders while the scheduler window is still open', async () => {
    const owner = await createUser('notify-dismissed-appointment-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const referenceDate = new Date('2030-01-01T12:15:00.000Z');
    const appointment = await AppointmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Consulta digestivo',
      date: new Date('2030-01-01T12:00:00.000Z'),
    });

    await notifyUpcomingAppointmentReminders(referenceDate);

    const created = await NotificationModel.findOne({
      type: 'appointment_reminder',
      'metadata.appointmentId': appointment._id.toString(),
      'metadata.reminderPhase': 'after',
    });

    expect(created).not.toBeNull();

    await notificationsDelete(created!._id.toString(), owner._id.toString());
    await notifyUpcomingAppointmentReminders(referenceDate);

    const reminders = await NotificationModel.find({
      type: 'appointment_reminder',
      'metadata.appointmentId': appointment._id.toString(),
      'metadata.reminderPhase': 'after',
    });
    const listed = await notificationsList(owner._id.toString(), { page: 1, limit: 20 });

    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.dismissedAt).toBeInstanceOf(Date);
    expect(listed.notifications).toHaveLength(0);
  });

  it('creates due dose reminders for owners and caregivers once per scheduled dose', async () => {
    const owner = await createUser('notify-dose-owner');
    const caregiver = await createUser('notify-dose-caregiver');
    const observer = await createUser('notify-dose-observer');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [
        { userId: owner._id, role: 'OWNER' },
        { userId: caregiver._id, role: 'CAREGIVER' },
        { userId: observer._id, role: 'OBSERVER' },
      ],
    });
    const referenceDate = new Date('2030-01-01T12:00:00.000Z');
    const doseTime = '12:00';
    const treatmentStart = new Date('2030-01-01T00:00:00.000Z');
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '920001',
      nombre: 'Metformina',
      pactivos: 'Metformina',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '850 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2031-01-01T00:00:00.000Z'),
    });
    await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Control glucosa',
      timeZone: 'UTC',
      startDate: treatmentStart,
      active: true,
      medicines: [
        {
          medicineId: medicine._id,
          amount: 0.5,
          firstDoseAt: referenceDate,
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: [doseTime],
          isRecurring: true,
        },
      ],
    });

    await notifyDueDoseReminders(referenceDate);
    await notifyDueDoseReminders(referenceDate);

    const notifications = await NotificationModel.find({ type: 'dose_reminder' });
    const recipientIds = notifications.map((notification) => notification.userId.toString()).sort();

    expect(notifications).toHaveLength(2);
    expect(recipientIds).toEqual([caregiver._id.toString(), owner._id.toString()].sort());
    expect(notifications[0]?.message).toContain('Control glucosa');
    expect(notifications[0]?.message).toContain('Metformina');
    expect(notifications[0]?.metadata?.amount).toBe(0.5);
  });

  it('creates dose reminders from civil daily times in the treatment timezone', async () => {
    const owner = await createUser('notify-dose-madrid-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '920011',
      nombre: 'Levotiroxina',
      pactivos: 'Levotiroxina',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '50 mcg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2031-01-01T00:00:00.000Z'),
    });
    await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Tiroides',
      timeZone: 'Europe/Madrid',
      startDate: new Date('2030-06-01T22:00:00.000Z'),
      active: true,
      medicines: [
        {
          medicineId: medicine._id,
          amount: 1,
          firstDoseAt: new Date('2030-06-01T22:00:00.000Z'),
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: ['10:00'],
          isRecurring: true,
        },
      ],
    });

    await notifyDueDoseReminders(new Date('2030-06-02T08:00:00.000Z'));

    const notifications = await NotificationModel.find({ type: 'dose_reminder' });

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.metadata?.doseAt).toBe('2030-06-02T08:00:00.000Z');
  });

  it('does not create dose reminders for already logged scheduled doses', async () => {
    const owner = await createUser('notify-dose-taken-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const referenceDate = new Date('2030-01-01T12:00:00.000Z');
    const doseTime = '12:00';
    const treatmentStart = new Date('2030-01-01T00:00:00.000Z');
    const medicine = await MedicineModel.create({
      blisterId: blister._id,
      nregist: '920002',
      nombre: 'Enalapril',
      pactivos: 'Enalapril',
      formaOficial: 'COMPRIMIDO',
      dosisOficial: '20 mg',
      iconType: 'pill',
      stock: 20,
      stockUnit: 'pastillas',
      threshold: 3,
      expDate: new Date('2031-01-01T00:00:00.000Z'),
    });
    const treatment = await TreatmentModel.create({
      blisterId: blister._id,
      patientUserId: owner._id,
      title: 'Tension',
      timeZone: 'UTC',
      startDate: treatmentStart,
      active: true,
      medicines: [
        {
          medicineId: medicine._id,
          amount: 1,
          firstDoseAt: referenceDate,
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: [doseTime],
          isRecurring: true,
        },
      ],
    });
    await AdherenceLogModel.create({
      blisterId: blister._id,
      medicineId: medicine._id,
      treatmentId: treatment._id,
      userId: owner._id,
      amount: 1,
      timestamp: referenceDate,
    });

    await notifyDueDoseReminders(referenceDate);

    expect(await NotificationModel.find({ type: 'dose_reminder' })).toHaveLength(0);
  });

  it('lists and removes push subscriptions for the authenticated user', async () => {
    const owner = await createUser('push-owner');
    const otherUser = await createUser('push-other');
    await PushSubscriptionModel.create([
      {
        userId: owner._id,
        endpoint: 'https://push.example.test/subscription/owner',
        keys: { p256dh: 'owner-key', auth: 'owner-auth' },
      },
      {
        userId: otherUser._id,
        endpoint: 'https://push.example.test/subscription/other',
        keys: { p256dh: 'other-key', auth: 'other-auth' },
      },
    ]);

    const list = await notificationsPushSubscriptionsList(owner._id.toString());
    await notificationsPushUnsubscribe(owner._id.toString(), {
      endpoint: 'https://push.example.test/subscription/owner',
    });

    expect(list).toHaveLength(1);
    expect(await PushSubscriptionModel.exists({ userId: owner._id })).toBeNull();
    expect(await PushSubscriptionModel.exists({ userId: otherUser._id })).not.toBeNull();
  });

  it('rejects subscription registration when VAPID keys are missing', async () => {
    if (notificationsPushConfig().enabled) return;

    const owner = await createUser('push-disabled');

    await expect(
      notificationsPushSubscribe(owner._id.toString(), {
        endpoint: 'https://push.example.test/subscription/disabled',
        expirationTime: null,
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      }),
    ).rejects.toMatchObject({
      code: 'PUSH_NOT_CONFIGURED',
    });
  });
});
