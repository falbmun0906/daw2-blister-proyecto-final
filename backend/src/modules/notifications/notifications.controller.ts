import type { Request, Response } from 'express';

import { HTTP_STATUS_NO_CONTENT, HTTP_STATUS_OK } from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import {
  deletePushSubscriptionSchema,
  notificationIdParamsSchema,
  notificationsListQuerySchema,
  pushSubscriptionSchema,
  type NotificationsListQuery,
} from '../../../../shared/schemas';
import {
  notificationsDelete,
  notificationsList,
  notificationsMarkAsRead,
} from './notifications.service';
import {
  notificationsPushConfig,
  notificationsPushSubscribe,
  notificationsPushSubscriptionsList,
  notificationsPushUnsubscribe,
} from './notifications-push.service';

/**
 * Lists inbox notifications for the authenticated user.
 */
export const notificationsListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const query = notificationsListQuerySchema.parse(request.query) as NotificationsListQuery;
  const result = await notificationsList(authenticatedRequest.auth.userId, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result.notifications,
    meta: result.meta,
  });
};

/**
 * Marks a notification as read for the authenticated user.
 */
export const notificationsMarkAsReadController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const params = notificationIdParamsSchema.parse(request.params);
  const result = await notificationsMarkAsRead(params.id, authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes a notification for the authenticated user.
 */
export const notificationsDeleteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const params = notificationIdParamsSchema.parse(request.params);
  await notificationsDelete(params.id, authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_NO_CONTENT).send();
};

/**
 * Returns the current Web Push public configuration for the authenticated client.
 */
export const notificationsPushConfigController = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: notificationsPushConfig(),
  });
};

/**
 * Lists Web Push subscriptions owned by the authenticated user.
 */
export const notificationsPushSubscriptionsListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await notificationsPushSubscriptionsList(authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Registers or refreshes a Web Push subscription for the authenticated user.
 */
export const notificationsPushSubscribeController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const body = pushSubscriptionSchema.parse(request.body);
  const userAgent = request.get('user-agent') ?? undefined;
  const result = await notificationsPushSubscribe(
    authenticatedRequest.auth.userId,
    body,
    userAgent,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Removes a Web Push subscription for the authenticated user.
 */
export const notificationsPushUnsubscribeController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const body = deletePushSubscriptionSchema.parse(request.body);
  await notificationsPushUnsubscribe(authenticatedRequest.auth.userId, body);

  response.status(HTTP_STATUS_NO_CONTENT).send();
};
