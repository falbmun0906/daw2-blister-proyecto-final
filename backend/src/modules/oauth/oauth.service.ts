import { createHash, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import { type StringValue } from 'ms';

import { env } from '../../config/env';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
} from '../../constants/http.constants';
import { OAuthTokenModel } from '../../models/oauthToken.model';
import { type JwtMcpOAuthPayload, type JwtMcpOAuthRefreshPayload } from '../../types/auth.types';
import { AppError } from '../../utils/app-error';
import { authLogin } from '../auth/auth.service';
import { OAUTH_CLIENT_ID, OAUTH_DEFAULT_CLIENT_ID, OAUTH_SCOPE } from './oauth.constants';

const AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1000;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

interface AuthorizeQuery {
  response_type?: unknown;
  client_id?: unknown;
  redirect_uri?: unknown;
  state?: unknown;
  code_challenge?: unknown;
  code_challenge_method?: unknown;
  scope?: unknown;
}

interface AuthorizeInput {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  state?: string;
  scope: string;
}

interface LoginConsentInput extends AuthorizeQuery {
  identifier?: unknown;
  password?: unknown;
  consent?: unknown;
}

interface AuthorizationCodeRecord {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  expiresAt: number;
}

interface TokenInput {
  grant_type?: unknown;
  client_id?: unknown;
  code?: unknown;
  redirect_uri?: unknown;
  code_verifier?: unknown;
  refresh_token?: unknown;
}

interface RegisterClientInput {
  redirect_uris?: unknown;
  redirect_uri?: unknown;
  client_name?: unknown;
  scope?: unknown;
}

interface OAuthClientRegistrationResult {
  client_id: string;
  client_id_issued_at: number;
  client_name?: string;
  redirect_uris: string[];
  grant_types: ['authorization_code', 'refresh_token'];
  response_types: ['code'];
  token_endpoint_auth_method: 'none';
  scope: string;
}

interface OAuthTokenResult {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
  refresh_token: string;
}

const authorizationCodes = new Map<string, AuthorizationCodeRecord>();

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const hashValue = (value: string): string => createHash('sha256').update(value).digest('hex');

const getMcpResourceAudience = (): string => new URL('/mcp', env.backendUrl).toString();

const assertOAuthError = (condition: boolean, code: string, message: string): void => {
  if (!condition) {
    throw new AppError({
      code,
      message,
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }
};

const isAllowedRedirectUri = (redirectUri: string): boolean => {
  try {
    const url = new URL(redirectUri);

    if (url.protocol === 'https:') {
      return true;
    }

    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

const isSupportedClientId = (clientId: string | undefined): boolean =>
  clientId === OAUTH_CLIENT_ID || clientId === OAUTH_DEFAULT_CLIENT_ID;

const normalizeAuthorizeInput = (input: AuthorizeQuery): AuthorizeInput => {
  const responseType = asString(input.response_type);
  const clientId = asString(input.client_id);
  const redirectUri = asString(input.redirect_uri);
  const codeChallenge = asString(input.code_challenge);
  const codeChallengeMethod = asString(input.code_challenge_method);
  const state = asString(input.state);
  const scope = asString(input.scope) ?? OAUTH_SCOPE;

  assertOAuthError(responseType === 'code', 'OAUTH_RESPONSE_TYPE_INVALID', 'Only response_type=code is supported.');
  assertOAuthError(isSupportedClientId(clientId), 'OAUTH_CLIENT_INVALID', 'OAuth client_id is invalid.');
  assertOAuthError(Boolean(redirectUri), 'OAUTH_REDIRECT_URI_MISSING', 'OAuth redirect_uri is required.');
  assertOAuthError(isAllowedRedirectUri(redirectUri!), 'OAUTH_REDIRECT_URI_INVALID', 'OAuth redirect_uri is not allowed.');
  assertOAuthError(Boolean(codeChallenge), 'OAUTH_PKCE_MISSING', 'OAuth code_challenge is required.');
  assertOAuthError(codeChallengeMethod === 'S256', 'OAUTH_PKCE_METHOD_INVALID', 'Only PKCE S256 is supported.');
  assertOAuthError(scope.split(/\s+/).includes(OAUTH_SCOPE), 'OAUTH_SCOPE_INVALID', 'OAuth scope must include mcp.');

  return {
    response_type: responseType!,
    client_id: clientId!,
    redirect_uri: redirectUri!,
    code_challenge: codeChallenge!,
    code_challenge_method: codeChallengeMethod!,
    state,
    scope,
  };
};

const buildPkceChallenge = (codeVerifier: string): string =>
  createHash('sha256').update(codeVerifier).digest('base64url');

const buildMcpOAuthPayload = (userId: string, clientId: string): JwtMcpOAuthPayload => ({
  sub: userId,
  type: 'mcp_oauth',
  aud: getMcpResourceAudience(),
  client_id: clientId,
  scope: OAUTH_SCOPE,
});

const buildMcpOAuthRefreshPayload = (userId: string, clientId: string): JwtMcpOAuthRefreshPayload => ({
  sub: userId,
  type: 'mcp_oauth_refresh',
  aud: getMcpResourceAudience(),
  client_id: clientId,
  scope: OAUTH_SCOPE,
  jti: randomBytes(16).toString('hex'),
});

const signMcpAccessToken = (userId: string, clientId: string): string =>
  jwt.sign(buildMcpOAuthPayload(userId, clientId), env.jwtSecret, {
    expiresIn: env.jwtAccessExpiresIn as StringValue,
  });

const signMcpRefreshToken = (userId: string, clientId: string): string =>
  jwt.sign(buildMcpOAuthRefreshPayload(userId, clientId), env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiresIn as StringValue,
  });

const getTokenExpiresIn = (token: string): number => {
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp ? decoded.exp * 1000 : Date.now();

  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
};

const getTokenExpiresAt = (token: string): number => {
  const decoded = jwt.decode(token) as { exp?: number } | null;

  return decoded?.exp ? decoded.exp * 1000 : Date.now();
};

const pruneExpiredCodes = (): void => {
  const now = Date.now();

  for (const [code, record] of authorizationCodes) {
    if (record.expiresAt <= now) {
      authorizationCodes.delete(code);
    }
  }
};

const verifyMcpRefreshToken = (refreshToken: string): JwtMcpOAuthRefreshPayload => {
  try {
    const payload = jwt.verify(refreshToken, env.jwtSecret, {
      audience: getMcpResourceAudience(),
    }) as JwtMcpOAuthRefreshPayload;

    if (
      payload.type !== 'mcp_oauth_refresh' ||
      !payload.scope.split(/\s+/).includes(OAUTH_SCOPE) ||
      !payload.jti
    ) {
      throw new AppError({
        code: 'OAUTH_REFRESH_INVALID',
        message: 'OAuth refresh token is invalid or expired.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    return payload;
  } catch {
    throw new AppError({
      code: 'OAUTH_REFRESH_INVALID',
      message: 'OAuth refresh token is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }
};

const persistMcpRefreshToken = async (userId: string, clientId: string, refreshToken: string): Promise<void> => {
  await OAuthTokenModel.deleteMany({
    userId,
    expiresAt: { $lte: new Date() },
  });
  await OAuthTokenModel.create({
    refreshToken: hashValue(refreshToken),
    clientId,
    userId,
    scope: OAUTH_SCOPE,
    expiresAt: new Date(getTokenExpiresAt(refreshToken)),
    createdAt: new Date(),
  });
};

const issueOAuthTokens = async (userId: string, clientId: string): Promise<OAuthTokenResult> => {
  const accessToken = signMcpAccessToken(userId, clientId);
  const refreshToken = signMcpRefreshToken(userId, clientId);

  await persistMcpRefreshToken(userId, clientId, refreshToken);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: getTokenExpiresIn(accessToken),
    scope: OAUTH_SCOPE,
    refresh_token: refreshToken,
  };
};

/**
 * Validates and normalizes OAuth authorization request parameters.
 */
export const validateAuthorizeQuery = (input: AuthorizeQuery): AuthorizeInput =>
  normalizeAuthorizeInput(input);

/**
 * Registers the public MCP OAuth client and returns metadata for the caller.
 */
export const registerOAuthClient = (input: RegisterClientInput): OAuthClientRegistrationResult => {
  const redirectUrisInput = input.redirect_uris;
  const redirectUris = typeof input.redirect_uri === 'string'
    ? [input.redirect_uri]
    : Array.isArray(redirectUrisInput)
    ? redirectUrisInput.filter((value): value is string => typeof value === 'string')
    : typeof redirectUrisInput === 'string'
    ? [redirectUrisInput]
    : [];
  const clientName = asString(input.client_name);
  const scope = asString(input.scope) ?? OAUTH_SCOPE;

  assertOAuthError(scope.split(/\s+/).includes(OAUTH_SCOPE), 'OAUTH_SCOPE_INVALID', 'OAuth scope must include mcp.');
  assertOAuthError(redirectUris.length > 0, 'OAUTH_REDIRECT_URI_MISSING', 'At least one OAuth redirect_uri is required.');
  redirectUris.forEach((redirectUri) => {
    assertOAuthError(isAllowedRedirectUri(redirectUri), 'OAUTH_REDIRECT_URI_INVALID', 'OAuth redirect_uri is not allowed.');
  });

  return {
    client_id: OAUTH_DEFAULT_CLIENT_ID,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: OAUTH_SCOPE,
  };
};

/**
 * Authenticates the user, records a short-lived authorization code and returns the redirect URI.
 */
export const createAuthorizationCode = async (input: LoginConsentInput): Promise<{ redirectUri: string }> => {
  const normalized = normalizeAuthorizeInput(input);
  const identifier = asString(input.identifier);
  const password = asString(input.password);

  assertOAuthError(Boolean(identifier), 'OAUTH_LOGIN_REQUIRED', 'Blister user identifier is required.');
  assertOAuthError(Boolean(password), 'OAUTH_LOGIN_REQUIRED', 'Blister user password is required.');
  assertOAuthError(input.consent === 'on' || input.consent === true, 'OAUTH_CONSENT_REQUIRED', 'User consent is required.');

  const authResult = await authLogin({
    identifier: identifier!,
    password: password!,
  });
  const code = randomBytes(32).toString('base64url');
  const redirectUrl = new URL(normalized.redirect_uri);

  pruneExpiredCodes();
  authorizationCodes.set(code, {
    userId: authResult.user.id,
    clientId: normalized.client_id,
    redirectUri: normalized.redirect_uri,
    codeChallenge: normalized.code_challenge,
    expiresAt: Date.now() + AUTHORIZATION_CODE_TTL_MS,
  });

  redirectUrl.searchParams.set('code', code);

  if (normalized.state) {
    redirectUrl.searchParams.set('state', normalized.state);
  }

  return {
    redirectUri: redirectUrl.toString(),
  };
};

const exchangeAuthorizationCode = async (input: TokenInput): Promise<OAuthTokenResult> => {
  const clientId = asString(input.client_id);
  const code = asString(input.code);
  const redirectUri = asString(input.redirect_uri);
  const codeVerifier = asString(input.code_verifier);

  assertOAuthError(isSupportedClientId(clientId), 'OAUTH_CLIENT_INVALID', 'OAuth client_id is invalid.');
  assertOAuthError(Boolean(code), 'OAUTH_CODE_MISSING', 'OAuth authorization code is required.');
  assertOAuthError(Boolean(redirectUri), 'OAUTH_REDIRECT_URI_MISSING', 'OAuth redirect_uri is required.');
  assertOAuthError(Boolean(codeVerifier), 'OAUTH_PKCE_MISSING', 'OAuth code_verifier is required.');
  assertOAuthError(CODE_VERIFIER_PATTERN.test(codeVerifier!), 'OAUTH_PKCE_INVALID', 'OAuth code_verifier is invalid.');

  pruneExpiredCodes();
  const record = authorizationCodes.get(code!);

  if (!record) {
    throw new AppError({
      code: 'OAUTH_CODE_INVALID',
      message: 'OAuth authorization code is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  authorizationCodes.delete(code!);

  assertOAuthError(record.clientId === clientId, 'OAUTH_CLIENT_INVALID', 'OAuth client_id does not match this code.');
  assertOAuthError(record.redirectUri === redirectUri, 'OAUTH_REDIRECT_URI_INVALID', 'OAuth redirect_uri does not match this code.');
  assertOAuthError(buildPkceChallenge(codeVerifier!) === record.codeChallenge, 'OAUTH_PKCE_INVALID', 'OAuth code_verifier does not match this code.');

  return issueOAuthTokens(record.userId, record.clientId);
};

const exchangeRefreshToken = async (input: TokenInput): Promise<OAuthTokenResult> => {
  const clientId = asString(input.client_id);
  const refreshToken = asString(input.refresh_token);

  assertOAuthError(isSupportedClientId(clientId), 'OAUTH_CLIENT_INVALID', 'OAuth client_id is invalid.');
  assertOAuthError(Boolean(refreshToken), 'OAUTH_REFRESH_MISSING', 'OAuth refresh_token is required.');

  const payload = verifyMcpRefreshToken(refreshToken!);
  const tokenHash = hashValue(refreshToken!);

  assertOAuthError(payload.client_id === clientId, 'OAUTH_CLIENT_INVALID', 'OAuth client_id does not match this refresh token.');

  const record = await OAuthTokenModel.findOne({
    refreshToken: tokenHash,
    clientId: payload.client_id,
    userId: payload.sub,
    scope: OAUTH_SCOPE,
  });

  if (
    !record ||
    record.expiresAt.getTime() <= Date.now() ||
    record.clientId !== payload.client_id
  ) {
    throw new AppError({
      code: 'OAUTH_REFRESH_INVALID',
      message: 'OAuth refresh token is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  await OAuthTokenModel.deleteOne({ _id: record._id });

  return issueOAuthTokens(payload.sub, record.clientId);
};

/**
 * Revokes a stored OAuth refresh token by deleting its persisted hash.
 */
export const revokeOAuthRefreshToken = async (refreshToken: string): Promise<void> => {
  await OAuthTokenModel.deleteOne({
    refreshToken: hashValue(refreshToken),
  });
};

/**
 * Exchanges a supported OAuth grant for MCP OAuth access and refresh tokens.
 */
export const exchangeOAuthToken = (input: TokenInput): Promise<OAuthTokenResult> => {
  const grantType = asString(input.grant_type);

  if (grantType === 'authorization_code') {
    return exchangeAuthorizationCode(input);
  }

  if (grantType === 'refresh_token') {
    return exchangeRefreshToken(input);
  }

  throw new AppError({
    code: 'OAUTH_GRANT_INVALID',
    message: 'Only authorization_code and refresh_token grants are supported.',
    statusCode: HTTP_STATUS_BAD_REQUEST,
  });
};

/**
 * Clears in-memory authorization codes between tests or controlled resets.
 */
export const clearOAuthAuthorizationCodes = (): void => {
  authorizationCodes.clear();
};
