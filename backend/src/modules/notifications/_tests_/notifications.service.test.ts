import { BlisterModel } from '../../../models/blister.model';
import { AppointmentModel } from '../../../models/appointment.model';
import { MedicineModel } from '../../../models/medicine.model';
import { NotificationModel } from '../../../models/notification.model';
import { PushSubscriptionModel } from '../../../models/pushSubscription.model';
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

    expect(await NotificationModel.findById(ownerNotification._id)).toBeNull();
    expect(await NotificationModel.findById(otherNotification._id)).not.toBeNull();
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
    expect(before?.title).toBe('Cita medica proxima');
    expect(after?.title).toBe('¿Qué tal ha ido la cita?');
    expect(after?.message).toBe('Tras la cita, revisa si hay algun cambio que anotar.');
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
