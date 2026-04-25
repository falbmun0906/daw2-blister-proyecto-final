import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import { type AuthenticatedRequest } from '../../types/auth.types';
import {
  medicinesCreate,
  medicinesDelete,
  medicinesList,
  medicinesUpdate,
} from './medicines.service';
import {
  type CreateMedicineInput,
  medicinesListQuerySchema,
  type MedicinesListQuery,
  type UpdateMedicineInput,
} from '../../../../shared/schemas';

/**
 * Lists the medicine inventory for the active blister context.
 */
export const medicinesListController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const query = medicinesListQuerySchema.parse(request.query) as MedicinesListQuery;
  const result = await medicinesList(
    request.params.blisterId as string,
    authenticatedRequest.auth.userId,
    query,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result.medicines,
    meta: result.meta,
  });
};

/**
 * Creates a medicine entry in the blister inventory.
 */
export const medicinesCreateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await medicinesCreate(
    request.params.blisterId as string,
    authenticatedRequest.auth.userId,
    request.body as CreateMedicineInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Updates mutable local inventory fields for a medicine entry.
 */
export const medicinesUpdateController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await medicinesUpdate(
    request.params.blisterId as string,
    request.params.id as string,
    authenticatedRequest.auth.userId,
    request.body as UpdateMedicineInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Deletes a medicine entry from the blister inventory.
 */
export const medicinesDeleteController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  await medicinesDelete(
    request.params.blisterId as string,
    request.params.id as string,
    authenticatedRequest.auth.userId,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};
