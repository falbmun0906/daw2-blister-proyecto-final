import type { NextFunction, Request, Response } from 'express';

import { validateAuthorizeQuery } from './oauth.service';

type OAuthAuthorizeInput = ReturnType<typeof validateAuthorizeQuery>;

export interface OAuthAuthorizeLocals {
  oauthAuthorizeInput: OAuthAuthorizeInput;
}

/**
 * Normalizes OAuth query parameters before the authorization page controller runs.
 */
export const attachOAuthAuthorizeQuery = (
  request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
  next: NextFunction,
): void => {
  response.locals.oauthAuthorizeInput = validateAuthorizeQuery(request.query);
  next();
};

/**
 * Normalizes OAuth form parameters before the authorization submit controller runs.
 */
export const attachOAuthAuthorizeBody = (
  request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
  next: NextFunction,
): void => {
  response.locals.oauthAuthorizeInput = validateAuthorizeQuery(request.body);
  next();
};
