import type { NextFunction, Request, Response } from 'express';

import { validateAuthorizeQuery } from './oauth.service';

type OAuthAuthorizeInput = Awaited<ReturnType<typeof validateAuthorizeQuery>>;

export interface OAuthAuthorizeLocals {
  oauthAuthorizeInput: OAuthAuthorizeInput;
}

/**
 * Normalizes OAuth query parameters before the authorization page controller runs.
 */
export const attachOAuthAuthorizeQuery = async (
  request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
  next: NextFunction,
): Promise<void> => {
  response.locals.oauthAuthorizeInput = await validateAuthorizeQuery(request.query);
  next();
};

/**
 * Normalizes OAuth form parameters before the authorization submit controller runs.
 */
export const attachOAuthAuthorizeBody = async (
  request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
  next: NextFunction,
): Promise<void> => {
  response.locals.oauthAuthorizeInput = await validateAuthorizeQuery(request.body);
  next();
};
