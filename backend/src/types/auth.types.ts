import { type Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthenticatedUser;
}

export interface JwtAccessPayload {
  credentialVersion?: number;
  sub: string;
  type: 'access';
}

export interface JwtMcpOAuthPayload {
  credentialVersion?: number;
  sub: string;
  type: 'mcp_oauth';
  aud: string;
  client_id: string;
  scope: string;
}

export interface JwtMcpOAuthRefreshPayload {
  credentialVersion?: number;
  sub: string;
  type: 'mcp_oauth_refresh';
  aud: string;
  client_id: string;
  scope: string;
  jti: string;
}

export interface JwtRefreshPayload {
  credentialVersion?: number;
  sub: string;
  type: 'refresh';
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
