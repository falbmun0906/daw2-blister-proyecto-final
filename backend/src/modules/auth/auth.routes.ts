import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import {
  registerSchema,
  confirmEmailSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  resetPasswordSchema,
  updateProfileSchema,
  mcpTokenSchema,
  revokeMcpTokenSchema,
} from '../../../../shared/schemas/index';
import {
  AUTH_LOGIN_RATE_LIMIT_MAX,
  AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
  AUTH_REGISTER_RATE_LIMIT_MAX,
  FIFTEEN_MINUTES_IN_MS,
  ONE_HOUR_IN_MS,
} from '../../constants/security.constants';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  authCreateMcpTokenController,
  authConfirmEmailController,
  authDeleteAccountController,
  authForgotPasswordController,
  authGetMcpTokenStatusController,
  authLoginController,
  authLogoutController,
  authRefreshController,
  authRegisterController,
  authResetPasswordController,
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

const createPasswordResetLimiter = () => rateLimit({
  windowMs: FIFTEEN_MINUTES_IN_MS,
  max: AUTH_PASSWORD_RESET_RATE_LIMIT_MAX,
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password, confirmPassword, privacyConsent, ageConfirmed]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ana Lopez
 *               username:
 *                 type: string
 *                 example: ana.lopez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ana@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password1!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: Password1!
 *               privacyConsent:
 *                 type: boolean
 *                 example: true
 *               ageConfirmed:
 *                 type: boolean
 *                 example: true
 *               inviteCode:
 *                 type: string
 *                 nullable: true
 *                 example: ABC123
 *     responses:
 *       201:
 *         description: User registered. Email confirmation is required before login.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: Ana Lopez
 *                 username: ana.lopez
 *                 email: ana@example.com
 *                 emailVerified: false
 *                 settings:
 *                   theme: system
 *                   font: standard
 *                   fontSize: normal
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error:
 *                 code: VALIDATION_ERROR
 *                 message: Request validation failed.
 *                 details:
 *                   - email: Introduce un correo electrónico válido.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: ana@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password1!
 *     responses:
 *       200:
 *         description: Access and refresh tokens issued.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 user:
 *                   id: 507f1f77bcf86cd799439011
 *                   name: Ana Lopez
 *                   username: ana.lopez
 *                   email: ana@example.com
 *                   emailVerified: true
 *                   settings:
 *                     theme: system
 *                     font: standard
 *                     fontSize: normal
 *                 accessToken: <jwt_access>
 *                 refreshToken: <jwt_refresh>
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Invalid credentials or unconfirmed email.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorEnvelope'
 *             example:
 *               success: false
 *               error:
 *                 code: AUTH_INVALID_CREDENTIALS
 *                 message: Invalid credentials.
 */
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), authLoginController);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset email without revealing account existence
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ana@example.com
 *     responses:
 *       200:
 *         description: Password reset flow accepted.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       400:
 *         description: Validation error.
 */

authRouter.post(
  '/forgot-password',
  createPasswordResetLimiter(),
  validate({ body: forgotPasswordSchema }),
  authForgotPasswordController,
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Store a new password using a one-time reset token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password, confirmPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 example: 9f2b5a0d6e4c8b1a7f3e9d2c5b8a1f0e
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword1!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword1!
 *     responses:
 *       200:
 *         description: Password changed and active refresh session cleared.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       400:
 *         description: Invalid token or validation error.
 *       410:
 *         description: Reset token expired.
 */

authRouter.post(
  '/reset-password',
  createPasswordResetLimiter(),
  validate({ body: resetPasswordSchema }),
  authResetPasswordController,
);

/**
 * @openapi
 * /auth/confirm-email:
 *   post:
 *     summary: Confirm a user email with a one-time token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: 9f2b5a0d6e4c8b1a7f3e9d2c5b8a1f0e
 *     responses:
 *       200:
 *         description: Email confirmed and current user profile returned.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: Ana Lopez
 *                 username: ana.lopez
 *                 email: ana@example.com
 *                 emailVerified: true
 *       400:
 *         description: Invalid or expired confirmation token.
 */

authRouter.post(
  '/confirm-email',
  validate({ body: confirmEmailSchema }),
  authConfirmEmailController,
);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token credentials
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: <jwt_refresh>
 *     responses:
 *       200:
 *         description: Fresh access and refresh tokens.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 accessToken: <new_jwt_access>
 *                 refreshToken: <new_jwt_refresh>
 *       400:
 *         description: Validation error.
 *       401:
 *         description: Invalid or expired refresh token.
 */
authRouter.post('/refresh', validate({ body: refreshTokenSchema }), authRefreshController);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the authenticated web refresh token
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session revoked.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       401:
 *         description: Missing or invalid JWT.
 */
authRouter.post('/logout', authenticate, authLogoutController);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     summary: Update the authenticated user profile
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ana Lopez Garcia
 *               settings:
 *                 type: object
 *                 example:
 *                   theme: dark
 *                   font: dyslexic
 *                   fontSize: large
 *     responses:
 *       200:
 *         description: Profile updated.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 id: 507f1f77bcf86cd799439011
 *                 name: Ana Lopez Garcia
 *                 username: ana.lopez
 *                 email: ana@example.com
 *                 emailVerified: true
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
 * /auth/account:
 *   delete:
 *     summary: Soft delete the authenticated account
 *     tags:
 *       - Auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account marked for deletion.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: null
 *       401:
 *         description: Missing or invalid JWT.
 */

authRouter.delete('/account', authenticate, authDeleteAccountController);

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
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 90
 *                 example: 30
 *     responses:
 *       201:
 *         description: MCP token generated.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 token: blister_mcp_abc123
 *                 expiresAt: 2031-06-01T10:00:00.000Z
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
