import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type BlisterRole } from '../../types/blister.types';
import {
  appointmentsCreate,
  appointmentsDelete,
  appointmentsList,
  appointmentsUpdate,
} from './appointments.service';
import {
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
