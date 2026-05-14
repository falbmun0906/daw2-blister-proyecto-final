import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

import { env } from '../config/env';
import { HTTP_STATUS_UNAUTHORIZED } from '../constants/http.constants';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { type JwtAccessPayload } from '../types/auth.types';

const extractBearerToken = (authorizationHeader?: string): string => {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new AppError({
      code: 'AUTH_TOKEN_MISSING',
      message: 'Authentication token is required.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  return authorizationHeader.replace('Bearer ', '').trim();
};

/**
 * Validates access tokens and injects the authenticated user context into the request.
 */
export const authenticate = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  try {
    const token = extractBearerToken(request.headers.authorization);
    const payload = jwt.verify(token, env.jwtSecret) as JwtAccessPayload;

    if (payload.type !== 'access') {
      throw new AppError({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication token is invalid.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    if (!Types.ObjectId.isValid(payload.sub)) {
      throw new AppError({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication token is invalid or expired.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    void UserModel.exists({ _id: payload.sub, deletedAt: null })
      .then((userExists) => {
        if (!userExists) {
          next(
            new AppError({
              code: 'AUTH_USER_INACTIVE',
              message: 'Authentication token is invalid or expired.',
              statusCode: HTTP_STATUS_UNAUTHORIZED,
            }),
          );
          return;
        }

        (request as Request & { auth: { userId: string } }).auth = {
          userId: payload.sub,
        };

        next();
      })
      .catch(next);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError({
        code: 'AUTH_TOKEN_INVALID',
        message: 'Authentication token is invalid or expired.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      }),
    );
  }
};
