import { createHash } from 'node:crypto';

import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import { env } from '../config/env';
import { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_UNAUTHORIZED } from '../constants/http.constants';
import { BlisterModel } from '../models/blister.model';
import { UserModel } from '../models/user.model';
import { type JwtMcpOAuthPayload } from '../types/auth.types';
import { AppError } from '../utils/app-error';
import { mcpTokenHeaderSchema } from '../../../shared/schemas';
import { type McpAuthContext, type McpBlisterContext } from './types';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
const MCP_TOKEN_SELECT = '+mcpToken +mcpTokenCreatedAt +mcpTokenExpiresAt +mcpTokenLastUsedAt';
const getMcpResourceAudience = (): string => new URL('/mcp', env.backendUrl).toString();

const resolveMcpOAuthUserId = (token: string): string | null => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      audience: getMcpResourceAudience(),
    }) as JwtMcpOAuthPayload;

    if (payload.type !== 'mcp_oauth' || !payload.scope.split(/\s+/).includes('mcp')) {
      return null;
    }

    return payload.sub;
  } catch {
    return null;
  }
};

const findTokenFromAuthorizationHeader = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

export const resolveRawMcpToken = (headers: Record<string, string | string[] | undefined>): string => {
  const authHeader = typeof headers.authorization === 'string' ? headers.authorization : undefined;
  const directHeader = typeof headers['x-mcp-token'] === 'string' ? headers['x-mcp-token'] : undefined;
  const tokenCandidate = findTokenFromAuthorizationHeader(authHeader) ?? directHeader;

  const parsed = mcpTokenHeaderSchema.safeParse({
    token: tokenCandidate,
  });

  if (!parsed.success) {
    throw new AppError({
      code: 'MCP_TOKEN_MISSING',
      message: 'MCP token is required in Authorization: Bearer <token> or x-mcp-token.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
      details: parsed.error.issues.map((issue) => issue.message),
    });
  }

  return parsed.data.token;
};

const toMcpBlisterContext = (blister: {
  _id: Types.ObjectId;
  name: string;
  members: Array<{ userId: Types.ObjectId; role: McpBlisterContext['role'] }>;
}, userId: string): McpBlisterContext | null => {
  const member = blister.members.find((entry) => entry.userId.toString() === userId);

  if (!member) {
    return null;
  }

  return {
    blisterId: blister._id.toString(),
    blisterName: blister.name,
    role: member.role,
  };
};

export const resolveMcpContextFromToken = async (token: string): Promise<McpAuthContext> => {
  const oauthUserId = resolveMcpOAuthUserId(token);

  if (oauthUserId) {
    const user = await UserModel.findOne({
      _id: new Types.ObjectId(oauthUserId),
      deletedAt: null,
    }).lean();

    if (!user) {
      throw new AppError({
        code: 'MCP_TOKEN_INVALID',
        message: 'MCP OAuth token is invalid or revoked.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    return resolveMcpContextForUser(user._id, user._id.toString());
  }

  const tokenHash = hashToken(token);
  const user = await UserModel.findOne({
    mcpToken: tokenHash,
    deletedAt: null,
  }).select(MCP_TOKEN_SELECT).lean();

  if (!user) {
    throw new AppError({
      code: 'MCP_TOKEN_INVALID',
      message: 'MCP token is invalid or revoked.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  if (user.mcpTokenExpiresAt && user.mcpTokenExpiresAt.getTime() <= Date.now()) {
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          mcpToken: null,
          mcpTokenCreatedAt: null,
          mcpTokenExpiresAt: null,
          mcpTokenLastUsedAt: null,
        },
      },
    );

    throw new AppError({
      code: 'MCP_TOKEN_EXPIRED',
      message: 'MCP token is expired. Generate a new token from Blister.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  await UserModel.updateOne(
    { _id: user._id },
    {
      $set: {
        mcpTokenLastUsedAt: new Date(),
      },
    },
  );

  return resolveMcpContextForUser(user._id, user._id.toString());
};

const resolveMcpContextForUser = async (userObjectId: Types.ObjectId, userId: string): Promise<McpAuthContext> => {
  const blisters = await BlisterModel.find({
    deletedAt: null,
    members: {
      $elemMatch: {
        userId: userObjectId,
      },
    },
  }).lean();

  const blisterContext = blisters
    .map((blister) => toMcpBlisterContext(blister, userId))
    .filter((value): value is McpBlisterContext => value !== null);

  if (blisterContext.length === 0) {
    throw new AppError({
      code: 'MCP_CONTEXT_EMPTY',
      message: 'The user has no active blister memberships.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  return {
    userId,
    blisters: blisterContext,
  };
};

export const assertMcpBlisterAccess = (
  context: McpAuthContext,
  blisterId: string,
): McpBlisterContext => {
  const blister = context.blisters.find((entry) => entry.blisterId === blisterId);

  if (!blister) {
    throw new AppError({
      code: 'BLISTER_ACCESS_FORBIDDEN',
      message: 'You do not have access to this blister.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }

  return blister;
};

export const assertMcpWriterRole = (blister: McpBlisterContext): void => {
  if (blister.role === 'OBSERVER') {
    throw new AppError({
      code: 'BLISTER_ROLE_FORBIDDEN',
      message: 'Observer role cannot execute write operations from MCP.',
      statusCode: HTTP_STATUS_FORBIDDEN,
    });
  }
};
