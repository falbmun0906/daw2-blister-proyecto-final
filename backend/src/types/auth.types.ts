import { type Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthenticatedUser;
}

export interface JwtAccessPayload {
  sub: string;
  type: 'access';
}

export interface JwtMcpOAuthPayload {
  sub: string;
  type: 'mcp_oauth';
  aud: 'mcp';
  client_id: string;
  scope: string;
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
