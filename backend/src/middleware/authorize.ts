import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { HTTP_STATUS_FORBIDDEN } from '../constants/http.constants';
import { type BlisterAccessLocals, type BlisterRole } from '../types/blister.types';
import { AppError } from '../utils/app-error';

interface AuthorizeOptions {
  code?: string;
  message?: string;
}

const DEFAULT_FORBIDDEN_CODE = 'BLISTER_ROLE_FORBIDDEN';
const DEFAULT_FORBIDDEN_MESSAGE = 'Role does not allow writing in this blister.';

/**
 * Authorizes the current blister role previously resolved by checkBlisterAccess.
 */
export const authorize = (
  allowedRoles: BlisterRole[],
  options: AuthorizeOptions = {},
): RequestHandler => (
  _request: Request,
  response: Response,
  next: NextFunction,
): void => {
  const { blisterRole: currentRole } = response.locals as BlisterAccessLocals;

  if (currentRole && allowedRoles.includes(currentRole)) {
    next();
    return;
  }

  next(
    new AppError({
      code: options.code ?? DEFAULT_FORBIDDEN_CODE,
      message: options.message ?? DEFAULT_FORBIDDEN_MESSAGE,
      statusCode: HTTP_STATUS_FORBIDDEN,
    }),
  );
};
