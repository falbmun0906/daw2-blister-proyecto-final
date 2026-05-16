import { Router } from 'express';

import {
  deletePushSubscriptionSchema,
  notificationIdParamsSchema,
  notificationsListQuerySchema,
  pushSubscriptionSchema,
} from '../../../../shared/schemas';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  notificationsDeleteController,
  notificationsListController,
  notificationsMarkAsReadController,
  notificationsPushConfigController,
  notificationsPushSubscribeController,
  notificationsPushSubscriptionsListController,
  notificationsPushUnsubscribeController,
} from './notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List inbox notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated notifications inbox.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Missing or invalid JWT.
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Missing or invalid JWT.
 *       404:
 *         description: Notification not found for this user.
 */
notificationsRouter.get(
  '/',
  validate({ query: notificationsListQuerySchema }),
  notificationsListController,
);

/**
 * @openapi
 * /notifications/push/config:
 *   get:
 *     summary: Get Web Push availability and the public VAPID key
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push configuration returned.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 enabled: true
 *                 publicKey: BLnJ4hZ8k...
 *       401:
 *         description: Missing or invalid JWT.
 */
notificationsRouter.get(
  '/push/config',
  notificationsPushConfigController,
);

/**
 * @openapi
 * /notifications/push/subscriptions:
 *   get:
 *     summary: List Web Push subscriptions for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registered browser subscriptions.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 507f1f77bcf86cd799439020
 *                   endpoint: https://fcm.googleapis.com/fcm/send/example
 *                   createdAt: 2031-05-01T10:00:00.000Z
 *       401:
 *         description: Missing or invalid JWT.
 *   post:
 *     summary: Register the current browser for Web Push notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint, keys]
 *             properties:
 *               endpoint:
 *                 type: string
 *                 example: https://fcm.googleapis.com/fcm/send/example
 *               expirationTime:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *               keys:
 *                 type: object
 *                 required: [p256dh, auth]
 *                 properties:
 *                   p256dh:
 *                     type: string
 *                     example: BEl6...
 *                   auth:
 *                     type: string
 *                     example: a1b2c3d4
 *     responses:
 *       201:
 *         description: Subscription stored or refreshed.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 507f1f77bcf86cd799439020
 *                 endpoint: https://fcm.googleapis.com/fcm/send/example
 *                 createdAt: 2031-05-01T10:00:00.000Z
 *       400:
 *         description: Validation error.
 *       503:
 *         description: Push service unavailable or not configured.
 *   delete:
 *     summary: Remove a Web Push subscription from the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [endpoint]
 *             properties:
 *               endpoint:
 *                 type: string
 *                 example: https://fcm.googleapis.com/fcm/send/example
 *     responses:
 *       200:
 *         description: Subscription removed.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Missing or invalid JWT.
 */
notificationsRouter.get(
  '/push/subscriptions',
  notificationsPushSubscriptionsListController,
);
notificationsRouter.post(
  '/push/subscriptions',
  validate({ body: pushSubscriptionSchema }),
  notificationsPushSubscribeController,
);
notificationsRouter.delete(
  '/push/subscriptions',
  validate({ body: deletePushSubscriptionSchema }),
  notificationsPushUnsubscribeController,
);
notificationsRouter.patch(
  '/:id/read',
  validate({ params: notificationIdParamsSchema }),
  notificationsMarkAsReadController,
);

/**
 * @openapi
 * /notifications/{id}:
 *   delete:
 *     summary: Delete one notification from the authenticated inbox
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439020
 *     responses:
 *       200:
 *         description: Notification deleted.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       401:
 *         description: Missing or invalid JWT.
 *       404:
 *         description: Notification not found for this user.
 */
notificationsRouter.delete(
  '/:id',
  validate({ params: notificationIdParamsSchema }),
  notificationsDeleteController,
);
