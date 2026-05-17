import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { NotificationModel } from '../../../models/notification.model';
import { PushSubscriptionModel } from '../../../models/pushSubscription.model';
import { UserModel } from '../../../models/user.model';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

describe('notifications.routes', () => {
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    nodeEnv: 'test',
  });

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
      emailVerified: true,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

  const createAccessToken = (userId: string): string =>
    jwt.sign(
      {
        sub: userId,
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );

  it('lists inbox notifications for the authenticated user', async () => {
    const owner = await createUser('route-list-owner');
    const otherUser = await createUser('route-list-other');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });

    await NotificationModel.create([
      {
        userId: owner._id,
        blisterId: blister._id,
        type: 'stock_low',
        severity: 'warning',
        title: 'Stock',
        message: 'Quedan pocas unidades',
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

    const response = await request(app)
      .get('/api/v1/notifications?page=1&limit=10')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Stock');
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('marks a notification as read', async () => {
    const owner = await createUser('route-read-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const notification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Sistema',
      message: 'Actualización general',
    });

    const response = await request(app)
      .patch(`/api/v1/notifications/${notification._id.toString()}/read`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    const storedNotification = await NotificationModel.findById(notification._id);

    expect(response.status).toBe(200);
    expect(response.body.data.isRead).toBe(true);
    expect(storedNotification?.isRead).toBe(true);
  });

  it('deletes an owned notification from the inbox', async () => {
    const owner = await createUser('route-delete-owner');
    const blister = await BlisterModel.create({
      name: 'Familia',
      members: [{ userId: owner._id, role: 'OWNER' }],
    });
    const notification = await NotificationModel.create({
      userId: owner._id,
      blisterId: blister._id,
      type: 'system',
      severity: 'info',
      title: 'Descartable',
      message: 'Debe eliminarse del buzon',
      isRead: true,
    });

    const response = await request(app)
      .delete(`/api/v1/notifications/${notification._id.toString()}`)
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    const stored = await NotificationModel.findById(notification._id);

    expect(response.status).toBe(204);
    expect(stored?.dismissedAt).toBeInstanceOf(Date);
  });

  it('returns 404 when accessing another user notification', async () => {
    const owner = await createUser('route-404-owner');
    const otherUser = await createUser('route-404-other');
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

    const response = await request(app)
      .patch(`/api/v1/notifications/${notification._id.toString()}/read`)
      .set('Authorization', `Bearer ${createAccessToken(otherUser._id.toString())}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
  });

  it('returns Web Push configuration for authenticated users', async () => {
    const owner = await createUser('route-push-config');

    const response = await request(app)
      .get('/api/v1/notifications/push/config')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('enabled');
    expect(response.body.data).toHaveProperty('publicKey');
  });

  it('lists and removes push subscriptions owned by the authenticated user', async () => {
    const owner = await createUser('route-push-owner');
    const otherUser = await createUser('route-push-other');
    await PushSubscriptionModel.create([
      {
        userId: owner._id,
        endpoint: 'https://push.example.test/subscription/route-owner',
        keys: { p256dh: 'owner-key', auth: 'owner-auth' },
      },
      {
        userId: otherUser._id,
        endpoint: 'https://push.example.test/subscription/route-other',
        keys: { p256dh: 'other-key', auth: 'other-auth' },
      },
    ]);

    const listResponse = await request(app)
      .get('/api/v1/notifications/push/subscriptions')
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);
    const deleteResponse = await request(app)
      .delete('/api/v1/notifications/push/subscriptions')
      .send({ endpoint: 'https://push.example.test/subscription/route-owner' })
      .set('Authorization', `Bearer ${createAccessToken(owner._id.toString())}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(deleteResponse.status).toBe(204);
    expect(await PushSubscriptionModel.exists({ userId: owner._id })).toBeNull();
    expect(await PushSubscriptionModel.exists({ userId: otherUser._id })).not.toBeNull();
  });
});
