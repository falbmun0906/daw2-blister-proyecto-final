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
  authGetMcpTokenStatusController,
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

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     responses:
 *       201:
 *         description: User registered and session created.
 *       400:
 *         description: Validation error.
 *       409:
 *         description: Email or username already exists.
 */
authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), authRegisterController);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate with email or username
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Access and refresh tokens issued.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Invalid credentials.
 */
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), authLoginController);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token credentials
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Fresh access and refresh tokens.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Invalid or expired refresh token.
 */
authRouter.post('/refresh', validate({ body: refreshTokenSchema }), authRefreshController);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     summary: Update the authenticated user profile
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated.
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Missing or invalid JWT.
 */
authRouter.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  authUpdateProfileController,
);

/**
 * @openapi
 * /auth/mcp-token:
 *   get:
 *     summary: Get the authenticated user MCP token status
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MCP token status returned.
 *       401:
 *         description: Missing or invalid JWT.
 *   post:
 *     summary: Create an MCP token for the authenticated user
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: MCP token generated.
 *       401:
 *         description: Missing or invalid JWT.
 *   delete:
 *     summary: Revoke the authenticated user MCP token
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MCP token revoked.
 *       401:
 *         description: Missing or invalid JWT.
 */
authRouter.get('/mcp-token', authenticate, authGetMcpTokenStatusController);
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
