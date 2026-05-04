import { createHash, randomBytes } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { type StringValue } from 'ms';

import { env } from '../../config/env';
import {
  BLISTER_ROLES,
  DEFAULT_PERSONAL_BLISTER_NAME,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  MAX_BLISTERS_PER_USER,
  THEME_OPTIONS,
} from '../../constants/domain.constants';
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_CONFLICT,
  HTTP_STATUS_UNAUTHORIZED,
} from '../../constants/http.constants';
import { BCRYPT_SALT_ROUNDS, MCP_TOKEN_DAY_MS } from '../../constants/security.constants';
import { BlisterModel } from '../../models/blister.model';
import { UserModel } from '../../models/user.model';
import { type AuthTokens, type JwtAccessPayload, type JwtRefreshPayload } from '../../types/auth.types';
import { type UserDocument, type UserSettings } from '../../types/user.types';
import { AppError } from '../../utils/app-error';
import {
  type LoginInput,
  type McpTokenInput,
  type RefreshTokenInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '../../../../shared/schemas/index';

interface PublicUser {
  id: string;
  name: string;
  username: string;
  email: string;
  settings: UserSettings;
}

interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

interface McpTokenResult {
  token: string;
  hasToken: true;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
}

interface McpTokenStatus {
  hasToken: boolean;
  createdAt: Date | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

type UserAuthDocument = UserDocument & {
  refreshTokenHash?: string | null;
  refreshTokenExpiresAt?: Date | null;
};

type UserMcpDocument = UserDocument & {
  mcpToken?: string | null;
  mcpTokenCreatedAt?: Date | null;
  mcpTokenExpiresAt?: Date | null;
  mcpTokenLastUsedAt?: Date | null;
};

const hashValue = (value: string): string => createHash('sha256').update(value).digest('hex');

const MCP_TOKEN_SELECT = '+mcpToken +mcpTokenCreatedAt +mcpTokenExpiresAt +mcpTokenLastUsedAt';

const emptyMcpTokenStatus = (): McpTokenStatus => ({
  hasToken: false,
  createdAt: null,
  expiresAt: null,
  lastUsedAt: null,
});

const getMcpTokenExpiry = (createdAt: Date, expiresInDays: number): Date =>
  new Date(createdAt.getTime() + expiresInDays * MCP_TOKEN_DAY_MS);

const isExpired = (date: Date | null | undefined): boolean =>
  Boolean(date && date.getTime() <= Date.now());

const sanitizeUser = (user: UserDocument): PublicUser => ({
  id: user._id.toString(),
  name: user.name,
  username: user.username,
  email: user.email,
  settings: user.settings,
});

const buildAccessTokenPayload = (userId: string): JwtAccessPayload => ({
  sub: userId,
  type: 'access',
});

const buildRefreshTokenPayload = (userId: string): JwtRefreshPayload => ({
  sub: userId,
  type: 'refresh',
  jti: randomBytes(8).toString('hex'),
});

const signAccessToken = (userId: string): string =>
  jwt.sign(buildAccessTokenPayload(userId), env.jwtSecret, {
    expiresIn: env.jwtAccessExpiresIn as StringValue,
  });

const signRefreshToken = (userId: string): string =>
  jwt.sign(buildRefreshTokenPayload(userId), env.jwtSecret, {
    expiresIn: env.jwtRefreshExpiresIn as StringValue,
  });

const parseJwtExpiration = (token: string): Date => {
  const decoded = jwt.decode(token) as { exp?: number } | null;

  if (!decoded?.exp) {
    throw new AppError({
      code: 'AUTH_TOKEN_INVALID',
      message: 'Refresh token is invalid.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  return new Date(decoded.exp * 1000);
};

const createTokens = async (userId: string): Promise<AuthTokens & { refreshTokenExpiresAt: Date }> => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt: parseJwtExpiration(refreshToken),
  };
};

const ensureUniqueCredentials = async (
  email?: string,
  username?: string,
  excludedUserId?: string,
): Promise<void> => {
  if (!email && !username) {
    return;
  }

  const credentialFilters: Array<{ email: string } | { username: string }> = [];

  if (email) {
    credentialFilters.push({ email });
  }

  if (username) {
    credentialFilters.push({ username });
  }

  const candidates = await UserModel.find({
    $or: credentialFilters,
    ...(excludedUserId ? { _id: { $ne: new Types.ObjectId(excludedUserId) } } : {}),
  }).lean();

  if (candidates.some((candidate) => candidate.email === email)) {
    throw new AppError({
      code: 'AUTH_EMAIL_CONFLICT',
      message: 'Email is already in use.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }

  if (candidates.some((candidate) => candidate.username === username)) {
    throw new AppError({
      code: 'AUTH_USERNAME_CONFLICT',
      message: 'Username is already in use.',
      statusCode: HTTP_STATUS_CONFLICT,
    });
  }
};

const findInviteTarget = async (inviteCode: string) => {
  const blister = await BlisterModel.findOne({
    'inviteCode.code': inviteCode,
    deletedAt: null,
  });

  if (!blister?.inviteCode || blister.inviteCode.exp.getTime() <= Date.now()) {
    throw new AppError({
      code: 'AUTH_INVITE_INVALID',
      message: 'Invite code is invalid or expired.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  return blister;
};

const persistRefreshToken = async (
  userId: string,
  refreshToken: string,
  refreshTokenExpiresAt: Date,
): Promise<void> => {
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        refreshTokenHash: hashValue(refreshToken),
        refreshTokenExpiresAt,
      },
    },
  );
};

const createDefaultSettings = (): UserSettings => ({
  theme: THEME_OPTIONS[2],
  font: FONT_OPTIONS[0],
  fontSize: FONT_SIZE_OPTIONS[0],
  notifications: {
    pushEnabled: false,
    stock: true,
    expiration: true,
    cima: true,
    adherence: true,
    appointments: true,
    appointmentReminderPreset: '3h',
    customAppointmentReminderHours: 3,
  },
});

/**
 * Registers a new user and either joins them to the invited blister or creates a personal one.
 */
export const authRegister = async (input: RegisterInput): Promise<AuthResult> => {
  await ensureUniqueCredentials(input.email, input.username);

  const targetBlister = input.inviteCode ? await findInviteTarget(input.inviteCode) : null;
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    username: input.username,
    email: input.email,
    password: passwordHash,
    settings: createDefaultSettings(),
  });

  if (targetBlister?.inviteCode) {
    targetBlister.members.push({
      userId: user._id,
      role: targetBlister.inviteCode.role,
    });
    targetBlister.inviteCode = null;
    await targetBlister.save();
  } else {
    await BlisterModel.create({
      name: DEFAULT_PERSONAL_BLISTER_NAME,
      members: [
        {
          userId: user._id,
          role: BLISTER_ROLES[0],
        },
      ],
    });
  }

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await createTokens(user._id.toString());
  await persistRefreshToken(user._id.toString(), refreshToken, refreshTokenExpiresAt);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

const findUserForLogin = async (identifier: string) => {
  // El email y el username se almacenan siempre en minúsculas (lowercase: true),
  // pero usamos un regex case-insensitive y anclado para tolerar cuentas
  // antiguas o creadas fuera del flujo estándar y soportar accesos como
  // "MiUsuario" o "Correo@Dominio.com" sin reglas estrictas en el cliente.
  const normalized = identifier.trim();
  if (!normalized) return null;

  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}$`, 'i');

  return UserModel.findOne({
    $or: [{ email: pattern }, { username: pattern }],
    deletedAt: null,
  }).select('+password +refreshTokenHash +refreshTokenExpiresAt');
};

/**
 * Authenticates a user with email or username and rotates their refresh token.
 */
export const authLogin = async (input: LoginInput): Promise<AuthResult> => {
  const user = await findUserForLogin(input.identifier);

  if (!user?.password) {
    if (env.nodeEnv !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[auth] login failed: user not found', { identifier: input.identifier });
    }
    throw new AppError({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    if (env.nodeEnv !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[auth] login failed: bad password', {
        identifier: input.identifier,
        userId: user._id.toString(),
      });
    }
    throw new AppError({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await createTokens(user._id.toString());
  await persistRefreshToken(user._id.toString(), refreshToken, refreshTokenExpiresAt);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

const verifyRefreshToken = (refreshToken: string): JwtRefreshPayload => {
  try {
    const payload = jwt.verify(refreshToken, env.jwtSecret) as JwtRefreshPayload;

    if (payload.type !== 'refresh') {
      throw new AppError({
        code: 'AUTH_REFRESH_INVALID',
        message: 'Refresh token is invalid or expired.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    return payload;
  } catch {
    throw new AppError({
      code: 'AUTH_REFRESH_INVALID',
      message: 'Refresh token is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }
};

/**
 * Rotates a stored refresh token and returns a fresh access and refresh pair.
 */
export const authRefresh = async (input: RefreshTokenInput): Promise<AuthTokens> => {
  const payload = verifyRefreshToken(input.refreshToken);
  const user = await UserModel.findById(payload.sub).select('+refreshTokenHash +refreshTokenExpiresAt');
  const storedUser = user as UserAuthDocument | null;

  if (
    !storedUser?.refreshTokenHash ||
    !storedUser.refreshTokenExpiresAt ||
    storedUser.refreshTokenExpiresAt.getTime() <= Date.now() ||
    storedUser.refreshTokenHash !== hashValue(input.refreshToken)
  ) {
    throw new AppError({
      code: 'AUTH_REFRESH_INVALID',
      message: 'Refresh token is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await createTokens(storedUser._id.toString());
  await persistRefreshToken(storedUser._id.toString(), refreshToken, refreshTokenExpiresAt);

  return {
    accessToken,
    refreshToken,
  };
};

const getUserById = async (userId: string) => {
  const user = await UserModel.findById(userId).select('+password');

  if (!user) {
    throw new AppError({
      code: 'AUTH_USER_NOT_FOUND',
      message: 'User not found.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  return user;
};

/**
 * Updates the authenticated user profile and settings.
 */
export const authUpdateProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<PublicUser> => {
  const user = await getUserById(userId);

  await ensureUniqueCredentials(input.email, input.username, userId);

  if (input.newPassword) {
    const hasCurrentPassword = await bcrypt.compare(input.currentPassword ?? '', user.password);

    if (!hasCurrentPassword) {
      throw new AppError({
        code: 'AUTH_CURRENT_PASSWORD_INVALID',
        message: 'Current password is invalid.',
        statusCode: HTTP_STATUS_UNAUTHORIZED,
      });
    }

    user.password = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);
  }

  if (input.name) {
    user.name = input.name;
  }

  if (input.username) {
    user.username = input.username;
  }

  if (input.email) {
    user.email = input.email;
  }

  if (input.settings) {
    user.settings = {
      ...user.settings,
      ...input.settings,
    };
  }

  await user.save();

  return sanitizeUser(user);
};

/**
 * Generates a one-time MCP token and stores only its hash in the user record.
 */
export const authCreateMcpToken = async (
  userId: string,
  input: McpTokenInput,
): Promise<McpTokenResult> => {
  const token = randomBytes(32).toString('hex');
  const createdAt = new Date();
  const expiresAt = getMcpTokenExpiry(createdAt, input.expiresInDays ?? env.mcpTokenTtlDays);

  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        mcpToken: hashValue(token),
        mcpTokenCreatedAt: createdAt,
        mcpTokenExpiresAt: expiresAt,
        mcpTokenLastUsedAt: null,
      },
    },
  );

  return {
    token,
    hasToken: true,
    createdAt,
    expiresAt,
    lastUsedAt: null,
  };
};

/**
 * Returns whether the authenticated user has an active MCP token.
 */
export const authGetMcpTokenStatus = async (userId: string): Promise<McpTokenStatus> => {
  const user = (await UserModel.findById(userId).select(MCP_TOKEN_SELECT)) as UserMcpDocument | null;

  if (!user?.mcpToken) {
    return emptyMcpTokenStatus();
  }

  if (isExpired(user.mcpTokenExpiresAt)) {
    await authRevokeMcpToken(userId);
    return emptyMcpTokenStatus();
  }

  return {
    hasToken: true,
    createdAt: user.mcpTokenCreatedAt ?? null,
    expiresAt: user.mcpTokenExpiresAt ?? null,
    lastUsedAt: user.mcpTokenLastUsedAt ?? null,
  };
};

/**
 * Revokes the stored MCP token for the authenticated user.
 */
export const authRevokeMcpToken = async (userId: string): Promise<void> => {
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        mcpToken: null,
        mcpTokenCreatedAt: null,
        mcpTokenExpiresAt: null,
        mcpTokenLastUsedAt: null,
      },
    },
  );
};
