import {
  authSessionSchema,
  authTokensSchema,
  confirmEmailSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  userSchema,
  type ConfirmEmailInput,
  type ForgotPasswordInput,
  type LoginInput,
  type LogoutInput,
  type RefreshTokenInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from '../../../shared/schemas/auth.schema';

import { apiClient, normalizeApiResponse } from './api.client';
import type { AuthSession, AuthTokens, User } from '../types/auth.types';

/**
 * Authenticates a user using an email address or username plus password.
 */
export async function login(input: LoginInput): Promise<AuthSession> {
  const payload = loginSchema.parse(input);
  const response = await apiClient.post('/auth/login', payload);
  return authSessionSchema.parse(normalizeApiResponse(response));
}

/**
 * Creates a new account and starts email confirmation before the first login.
 * El esquema ya transforma `inviteCode` vacío a `undefined`; si tras el parse
 * sigue siendo `undefined`, lo eliminamos del payload para no enviar la clave.
 */
export async function register(input: RegisterInput): Promise<User> {
  const parsed = registerSchema.parse(input);
  const { inviteCode, ...rest } = parsed;
  const payload = inviteCode === undefined ? rest : { ...rest, inviteCode };
  const response = await apiClient.post('/auth/register', payload);
  return userSchema.parse(normalizeApiResponse(response));
}

/**
 * Rotates the refresh token and obtains a new access token pair.
 */
export async function refresh(input: RefreshTokenInput): Promise<AuthTokens> {
  const payload = refreshTokenSchema.parse(input);
  const response = await apiClient.post('/auth/refresh', payload);
  return authTokensSchema.parse(normalizeApiResponse(response));
}

/**
 * Revokes the current stored refresh token on the backend.
 */
export async function logout(refreshToken?: string): Promise<void> {
  const payload: LogoutInput = logoutSchema.parse(refreshToken ? { refreshToken } : {});
  await apiClient.post('/auth/logout', payload);
}

/**
 * Requests password reset instructions without revealing if the account exists.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const payload = forgotPasswordSchema.parse(input);
  await apiClient.post('/auth/forgot-password', payload);
}

/**
 * Stores a new password using a one-time reset token.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const payload = resetPasswordSchema.parse(input);
  await apiClient.post('/auth/reset-password', payload);
}

/**
 * Confirms an account email using the one-time token from the email link.
 */
export async function confirmEmail(input: ConfirmEmailInput): Promise<User> {
  const payload = confirmEmailSchema.parse(input);
  const response = await apiClient.post('/auth/confirm-email', payload);
  return userSchema.parse(normalizeApiResponse(response));
}

/**
 * Updates the profile, accessibility settings, or password of the current user.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const payload = updateProfileSchema.parse(input);
  const response = await apiClient.patch('/auth/profile', payload);
  return userSchema.parse(normalizeApiResponse(response));
}
