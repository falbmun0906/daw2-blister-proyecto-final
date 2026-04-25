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

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
