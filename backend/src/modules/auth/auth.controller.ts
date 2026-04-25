import type { Request, Response } from 'express';

import {
  HTTP_STATUS_CREATED,
  HTTP_STATUS_OK,
} from '../../constants/http.constants';
import {
  authCreateMcpToken,
  authLogin,
  authRefresh,
  authRegister,
  authRevokeMcpToken,
  authUpdateProfile,
} from './auth.service';
import {
  type AuthenticatedRequest,
} from '../../types/auth.types';
import {
  type LoginInput,
  type McpTokenInput,
  type RefreshTokenInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../../../../shared/schemas';

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
