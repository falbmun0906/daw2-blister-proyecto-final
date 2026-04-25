import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  mcpTokenSchema,
  revokeMcpTokenSchema,
} from '../../../../shared/schemas/index';
import {
  AUTH_LOGIN_RATE_LIMIT_MAX,
  AUTH_REGISTER_RATE_LIMIT_MAX,
  FIFTEEN_MINUTES_IN_MS,
  ONE_HOUR_IN_MS,
} from '../../constants/security.constants';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  authCreateMcpTokenController,
  authLoginController,
  authRefreshController,
  authRegisterController,
  authRevokeMcpTokenController,
  authUpdateProfileController,
} from './auth.controller';

const registerLimiter = rateLimit({
  windowMs: ONE_HOUR_IN_MS,
  max: AUTH_REGISTER_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_IN_MS,
  max: AUTH_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), authRegisterController);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), authLoginController);
authRouter.post('/refresh', validate({ body: refreshTokenSchema }), authRefreshController);
authRouter.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  authUpdateProfileController,
);
authRouter.post(
  '/mcp-token',
  authenticate,
  validate({ body: mcpTokenSchema }),
  authCreateMcpTokenController,
);
authRouter.delete(
  '/mcp-token',
  authenticate,
  validate({ body: revokeMcpTokenSchema }),
  authRevokeMcpTokenController,
);
