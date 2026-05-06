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
notificationsRouter.get(
  '/push/config',
  notificationsPushConfigController,
);
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
notificationsRouter.delete(
  '/:id',
  validate({ params: notificationIdParamsSchema }),
  notificationsDeleteController,
);
