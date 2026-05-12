import { Router } from 'express';

import {
  oauthAuthorizePageController,
  oauthAuthorizeSubmitController,
  oauthRegisterController,
  oauthTokenController,
} from './oauth.controller';
import { validate } from '../../middleware/validate';
import {
  attachOAuthAuthorizeBody,
  attachOAuthAuthorizeQuery,
} from './oauth.middleware';
import {
  oauthAuthorizeQuerySchema,
  oauthAuthorizeSubmitSchema,
  oauthRegisterRequestSchema,
  oauthTokenRequestSchema,
} from './oauth.schema';

export const oauthRouter = Router();

oauthRouter.get(
  '/authorize',
  validate({ query: oauthAuthorizeQuerySchema }),
  attachOAuthAuthorizeQuery,
  oauthAuthorizePageController,
);
oauthRouter.post(
  '/authorize',
  validate({ body: oauthAuthorizeSubmitSchema }),
  attachOAuthAuthorizeBody,
  oauthAuthorizeSubmitController,
);
oauthRouter.post('/token', validate({ body: oauthTokenRequestSchema }), oauthTokenController);
oauthRouter.post('/register', validate({ body: oauthRegisterRequestSchema }), oauthRegisterController);
