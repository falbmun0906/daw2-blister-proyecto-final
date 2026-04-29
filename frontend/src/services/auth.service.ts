import {
  authSessionSchema,
  authTokensSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
  userSchema,
  type LoginInput,
  type RefreshTokenInput,
  type RegisterInput,
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
 * Creates a new account and returns the initial authenticated session.
 * El esquema ya transforma `inviteCode` vacío a `undefined`; si tras el parse
 * sigue siendo `undefined`, lo eliminamos del payload para no enviar la clave.
 */
export async function register(input: RegisterInput): Promise<AuthSession> {
  const parsed = registerSchema.parse(input);
  const { inviteCode, ...rest } = parsed;
  const payload = inviteCode === undefined ? rest : { ...rest, inviteCode };
  const response = await apiClient.post('/auth/register', payload);
  return authSessionSchema.parse(normalizeApiResponse(response));
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
 * Updates the profile, accessibility settings, or password of the current user.
 */
export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const payload = updateProfileSchema.parse(input);
  const response = await apiClient.patch('/auth/profile', payload);
  return userSchema.parse(normalizeApiResponse(response));
}