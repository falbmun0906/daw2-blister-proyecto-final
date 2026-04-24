import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodType } from 'zod';

import { HTTP_STATUS_BAD_REQUEST } from '../constants/http.constants';
import { AppError } from '../utils/app-error';

interface ValidationSchemas {
  body?: ZodType<unknown>;
  params?: ZodType<unknown>;
  query?: ZodType<unknown>;
}

const toValidationDetails = (error: ZodError): string[] =>
  error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);

/**
 * Validates request inputs against shared Zod schemas before controllers run.
 */
export const validate = ({ body, params, query }: ValidationSchemas): RequestHandler => {
  return (request: Request, _response: Response, next: NextFunction): void => {
    try {
      if (body) {
        request.body = body.parse(request.body) as Request['body'];
      }

      if (params) {
        request.params = params.parse(request.params) as Request['params'];
      }

      if (query) {
        request.query = query.parse(request.query) as Request['query'];
      }

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        next(
          new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed.',
            statusCode: HTTP_STATUS_BAD_REQUEST,
            details: toValidationDetails(error),
          }),
        );
        return;
      }

      next(error);
    }
  };
};
