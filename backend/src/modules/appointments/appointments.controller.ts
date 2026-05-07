import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import { type BlisterRole } from '../../types/blister.types';
import {
  appointmentsAddComment,
  appointmentsDeleteComment,
  appointmentsCreate,
  appointmentsDelete,
  appointmentsList,
  appointmentsUpdateComment,
  appointmentsUpdate,
} from './appointments.service';
import {
  type AppointmentCommentInput,
  appointmentsListQuerySchema,
  type AppointmentsListQuery,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from '../../../../shared/schemas';

/**
 * Lists appointments for the active blister context.
 */
export const appointmentsListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const query = appointmentsListQuerySchema.parse(request.query) as AppointmentsListQuery;
  const result = await appointmentsList(request.params.blisterId as string, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result.appointments,
    meta: result.meta,
  });
};

/**
 * Adds a comment to an appointment in the active blister.
 */
export const appointmentsAddCommentController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await appointmentsAddComment(
    request.params.blisterId as string,
    request.params.id as string,
    authenticatedRequest.auth.userId,
    response.locals.blisterRole as BlisterRole,
    request.body as AppointmentCommentInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Updates a comment in the active blister.
 */
export const appointmentsUpdateCommentController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await appointmentsUpdateComment(
    request.params.blisterId as string,
    request.params.id as string,
    request.params.commentId as string,
    authenticatedRequest.auth.userId,
    response.locals.blisterRole as BlisterRole,
    request.body as AppointmentCommentInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes a comment from an appointment in the active blister.
 */
export const appointmentsDeleteCommentController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await appointmentsDeleteComment(
    request.params.blisterId as string,
    request.params.id as string,
    request.params.commentId as string,
    authenticatedRequest.auth.userId,
    response.locals.blisterRole as BlisterRole,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Creates an appointment in the active blister.
 */
export const appointmentsCreateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await appointmentsCreate(
    request.params.blisterId as string,
    response.locals.blisterRole as BlisterRole,
    request.body as CreateAppointmentInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Updates an appointment in the active blister.
 */
export const appointmentsUpdateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await appointmentsUpdate(
    request.params.blisterId as string,
    request.params.id as string,
    response.locals.blisterRole as BlisterRole,
    request.body as UpdateAppointmentInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes an appointment in the active blister.
 */
export const appointmentsDeleteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  await appointmentsDelete(
    request.params.blisterId as string,
    request.params.id as string,
    response.locals.blisterRole as BlisterRole,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};
