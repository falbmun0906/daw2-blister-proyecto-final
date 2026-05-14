import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_NOT_FOUND,
} from '../constants/http.constants';
import { BlisterModel } from '../models/blister.model';
import { type AuthenticatedRequest } from '../types/auth.types';
import {
  type BlisterAccessLocals,
  type BlisterMember,
} from '../types/blister.types';
import { AppError } from '../utils/app-error';

interface CheckBlisterAccessOptions {
  includeDeleted?: boolean;
}

const getBlisterParam = (request: Request): string | undefined =>
  (request.params.blisterId ?? request.params.id) as string | undefined;

/**
 * Verifies authenticated membership in the target blister and exposes the caller role in response locals.
 */
export const createCheckBlisterAccess = ({ includeDeleted = false }: CheckBlisterAccessOptions = {}) => async (
  request: Request,
  response: Response<unknown, BlisterAccessLocals>,
  next: NextFunction,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const blisterId = getBlisterParam(request);

  if (!blisterId) {
    next();
    return;
  }

  if (!Types.ObjectId.isValid(blisterId)) {
    next(
      new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        statusCode: HTTP_STATUS_BAD_REQUEST,
        details: ['blisterId: Invalid ObjectId.'],
      }),
    );
    return;
  }

  const blister = await BlisterModel.findOne({
    _id: new Types.ObjectId(blisterId),
    ...(includeDeleted ? {} : { deletedAt: null }),
  });

  if (!blister) {
    next(
      new AppError({
        code: 'BLISTER_NOT_FOUND',
        message: 'Blister not found.',
        statusCode: HTTP_STATUS_NOT_FOUND,
      }),
    );
    return;
  }

  const membership = blister.members.find(
    (member: BlisterMember) => member.userId.toString() === authenticatedRequest.auth.userId,
  );

  if (!membership) {
    next(
      new AppError({
        code: 'BLISTER_ACCESS_FORBIDDEN',
        message: 'You do not have access to this blister.',
        statusCode: HTTP_STATUS_FORBIDDEN,
      }),
    );
    return;
  }

  response.locals.blisterRole = membership.role;
  next();
};

export const checkBlisterAccess = createCheckBlisterAccess();
export const checkBlisterAccessIncludingDeleted = createCheckBlisterAccess({ includeDeleted: true });
