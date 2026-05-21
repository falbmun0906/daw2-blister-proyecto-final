import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type BlisterRole } from '../../types/blister.types';
import {
  treatmentsCreate,
  treatmentsDelete,
  treatmentsList,
  treatmentsUpdate,
} from './treatments.service';
import {
  type CreateTreatmentInput,
  type TreatmentsListQuery,
  treatmentsListQuerySchema,
  type UpdateTreatmentInput,
} from '../../../../shared/schemas';

/**
 * Lists treatments for the active blister context.
 */
export const treatmentsListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const query = treatmentsListQuerySchema.parse(request.query) as TreatmentsListQuery;
  const result = await treatmentsList(request.params.blisterId as string, query);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result.treatments,
    meta: result.meta,
  });
};

/**
 * Creates a treatment in the active blister.
 */
export const treatmentsCreateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await treatmentsCreate(
    request.params.blisterId as string,
    response.locals.blisterRole as BlisterRole,
    request.body as CreateTreatmentInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Updates a treatment in the active blister.
 */
export const treatmentsUpdateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await treatmentsUpdate(
    request.params.blisterId as string,
    request.params.id as string,
    response.locals.blisterRole as BlisterRole,
    request.body as UpdateTreatmentInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes a treatment in the active blister.
 */
export const treatmentsDeleteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  await treatmentsDelete(
    request.params.blisterId as string,
    request.params.id as string,
    response.locals.blisterRole as BlisterRole,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};
