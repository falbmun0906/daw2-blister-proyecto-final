import { Router } from 'express';

import {
  oauthAuthorizePageController,
  oauthAuthorizeSubmitController,
  oauthTokenController,
} from './oauth.controller';

export const oauthRouter = Router();

oauthRouter.get('/authorize', oauthAuthorizePageController);
oauthRouter.post('/authorize', oauthAuthorizeSubmitController);
oauthRouter.post('/token', oauthTokenController);
