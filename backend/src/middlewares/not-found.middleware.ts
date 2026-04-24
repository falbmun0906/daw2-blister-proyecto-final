import type { NextFunction, Request, Response } from 'express';

import { HTTP_STATUS_NOT_FOUND } from '../constants/http.constants';
import { AppError } from '../utils/app-error';

/**
 * Raises a standard not-found error for unmatched routes.
 */
export const notFoundMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  next(
    new AppError({
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.originalUrl} was not found.`,
      statusCode: HTTP_STATUS_NOT_FOUND,
    }),
  );
};
