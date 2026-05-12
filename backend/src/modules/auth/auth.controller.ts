import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import {
  authConfirmEmail,
  authCreateMcpToken,
  authDeleteAccount,
  authForgotPassword,
  authGetMcpTokenStatus,
  authLogin,
  authRefresh,
  authRegister,
  authResetPassword,
  authRevokeMcpToken,
  authUpdateProfile,
} from './auth.service';
import {
  type AuthenticatedRequest,
} from '../../types/auth.types';
import {
  type ConfirmEmailInput,
  type LoginInput,
  type McpTokenInput,
  type ForgotPasswordInput,
  type RefreshTokenInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from '../../../../shared/schemas/index';

/**
 * Registers a new user and returns the initial auth session.
 */
export const authRegisterController = async (request: Request, response: Response): Promise<void> => {
  const result = await authRegister(request.body as RegisterInput);

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Authenticates a user and returns a fresh session.
 */
export const authLoginController = async (request: Request, response: Response): Promise<void> => {
  const result = await authLogin(request.body as LoginInput);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Rotates refresh credentials and returns a new access session.
 */
export const authRefreshController = async (request: Request, response: Response): Promise<void> => {
  const result = await authRefresh(request.body as RefreshTokenInput);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Starts the password reset flow without revealing whether the email exists.
 */
export const authForgotPasswordController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  await authForgotPassword(request.body as ForgotPasswordInput);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};

/**
 * Consumes a valid reset token and stores a new password.
 */
export const authResetPasswordController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  await authResetPassword(request.body as ResetPasswordInput);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};

/**
 * Confirms the email address linked to a one-time token.
 */
export const authConfirmEmailController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const result = await authConfirmEmail(request.body as ConfirmEmailInput);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Updates the authenticated user profile.
 */
export const authUpdateProfileController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await authUpdateProfile(
    authenticatedRequest.auth.userId,
    request.body as UpdateProfileInput,
  );

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Soft deletes the authenticated account and invalidates stored credentials.
 */
export const authDeleteAccountController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  await authDeleteAccount(authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};

/**
 * Returns the active MCP token status for the authenticated user.
 */
export const authGetMcpTokenStatusController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await authGetMcpTokenStatus(authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: result,
  });
};

/**
 * Generates a clear-text MCP token for the authenticated user.
 */
export const authCreateMcpTokenController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  const result = await authCreateMcpToken(
    authenticatedRequest.auth.userId,
    request.body as McpTokenInput,
  );

  response.status(HTTP_STATUS_CREATED).json({
    success: true,
    data: result,
  });
};

/**
 * Revokes the MCP token for the authenticated user.
 */
export const authRevokeMcpTokenController = async (
  request: Request,
  response: Response,
): Promise<void> => {
  const authenticatedRequest = request as AuthenticatedRequest;
  await authRevokeMcpToken(authenticatedRequest.auth.userId);

  response.status(HTTP_STATUS_OK).json({
    success: true,
    data: null,
  });
};
