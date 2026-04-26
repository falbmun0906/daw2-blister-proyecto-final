import { createHash } from 'node:crypto';

import { Types } from 'mongoose';

import { HTTP_STATUS_FORBIDDEN, HTTP_STATUS_UNAUTHORIZED } from '../constants/http.constants';
import { BlisterModel } from '../models/blister.model';
import { UserModel } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { mcpTokenHeaderSchema } from '../../../shared/schemas';
import { type McpAuthContext, type McpBlisterContext } from './types';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

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
  const tokenHash = hashToken(token);
  const user = await UserModel.findOne({
    mcpToken: tokenHash,
    deletedAt: null,
  }).select('+mcpToken').lean();

  if (!user) {
    throw new AppError({
      code: 'MCP_TOKEN_INVALID',
      message: 'MCP token is invalid or revoked.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const userId = user._id.toString();
  const blisters = await BlisterModel.find({
    deletedAt: null,
    members: {
      $elemMatch: {
        userId: user._id,
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
