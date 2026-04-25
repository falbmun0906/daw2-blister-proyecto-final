import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import { type BlisterRole } from '../../types/blister.types';
import {
  adherenceLogsCreate,
  adherenceLogsDelete,
  adherenceLogsList,
} from './adherence.service';
import {
  adherenceLogsListQuerySchema,
  type AdherenceLogsListQuery,
  type CreateAdherenceLogInput,
} from '../../../../shared/schemas';

/**
 * Lists adherence logs for the active blister context.
 */
export const adherenceLogsListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const query = adherenceLogsListQuerySchema.parse(request.query) as AdherenceLogsListQuery;
  const result = await adherenceLogsList(request.params.blisterId as string, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result.logs,
    meta: result.meta,
  });
};

/**
 * Creates an adherence log in the active blister context.
 */
export const adherenceLogsCreateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await adherenceLogsCreate(
    request.params.blisterId as string,
    authenticatedRequest.auth.userId,
    response.locals.blisterRole as BlisterRole,
    request.body as CreateAdherenceLogInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes an adherence log in the active blister context.
 */
export const adherenceLogsDeleteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;

  await adherenceLogsDelete(
    request.params.blisterId as string,
    request.params.id as string,
    authenticatedRequest.auth.userId,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};
