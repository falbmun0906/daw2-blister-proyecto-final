import type { NextFunction, Request, Response } from 'express';
import sanitize from 'mongo-sanitize';

/**
 * Sanitizes request payloads to prevent NoSQL operator injection.
 */
export const requestSanitizerMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  sanitize(request.body);
  sanitize(request.params);

  next();
};
