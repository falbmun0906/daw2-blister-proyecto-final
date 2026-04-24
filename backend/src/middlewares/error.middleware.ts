import type { NextFunction, Request, Response } from 'express';

import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../constants/http.constants';
import { AppError } from '../utils/app-error';

/**
 * Converts thrown errors into the API error contract.
 */
export const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  if (error instanceof Error) {
    response.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
    return;
  }

  response.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
