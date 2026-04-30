import type { Request, Response } from 'express';

import { HTTP_STATUS_NO_CONTENT, HTTP_STATUS_OK } from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
  type NotificationsListQuery,
} from '../../../../shared/schemas';
import {
  notificationsDelete,
  notificationsList,
  notificationsMarkAsRead,
} from './notifications.service';

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
