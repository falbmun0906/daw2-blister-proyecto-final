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
  HTTP_STATUS_FORBIDDEN,
  HTTP_STATUS_GONE,
  HTTP_STATUS_UNAUTHORIZED,
} from '../../constants/http.constants';
import {
  BCRYPT_SALT_ROUNDS,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  MCP_TOKEN_DAY_MS,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from '../../constants/security.constants';
import { BlisterModel } from '../../models/blister.model';
import { EmailVerificationTokenModel } from '../../models/emailVerificationToken.model';
import { OAuthTokenModel } from '../../models/oauthToken.model';
import { PasswordResetTokenModel } from '../../models/passwordResetToken.model';
import { PushSubscriptionModel } from '../../models/pushSubscription.model';
import { UserModel } from '../../models/user.model';
import { type AuthTokens, type JwtAccessPayload, type JwtRefreshPayload } from '../../types/auth.types';
import { type UserDocument, type UserSettings } from '../../types/user.types';
import { AppError } from '../../utils/app-error';
import {
  type ConfirmEmailInput,
  type ForgotPasswordInput,
  type LoginInput,
  type McpTokenInput,
  type RefreshTokenInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from '../../../../shared/schemas/index';
import * as authEmailService from './auth-email.service';

interface PublicUser {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  pendingEmail?: string | null;
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
  emailVerified: user.emailVerified === true,
  pendingEmail: user.pendingEmail ?? null,
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

const assertEmailVerified = (user: Pick<UserDocument, 'emailVerified'>): void => {
  if (user.emailVerified) return;

  throw new AppError({
    code: 'AUTH_EMAIL_NOT_VERIFIED',
    message: 'Email address must be confirmed before using Blister.',
    statusCode: HTTP_STATUS_FORBIDDEN,
  });
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

const buildPasswordResetUrl = (token: string): string => {
  const resetUrl = new URL('/reset-password', env.clientOrigin);
  resetUrl.searchParams.set('token', token);

  return resetUrl.toString();
};

const buildEmailConfirmationUrl = (token: string): string => {
  const confirmUrl = new URL('/confirm-email', env.clientOrigin);
  confirmUrl.searchParams.set('token', token);

  return confirmUrl.toString();
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
  const result = await UserModel.updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        refreshTokenHash: hashValue(refreshToken),
        refreshTokenExpiresAt,
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new AppError({
      code: 'AUTH_USER_INACTIVE',
      message: 'Authentication session is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }
};

const revokeRefreshCredentials = async (userId: string): Promise<void> => {
  await UserModel.updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
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
    doses: true,
    appointments: true,
    appointmentReminderPreset: '3h',
    customAppointmentReminderHours: 3,
  },
});

const sendEmailConfirmation = async (
  user: Pick<UserDocument, '_id' | 'name'>,
  email: string,
): Promise<void> => {
  const token = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  await EmailVerificationTokenModel.deleteMany({
    userId: user._id.toString(),
    email,
  });
  await EmailVerificationTokenModel.create({
    tokenHash: hashValue(token),
    userId: user._id.toString(),
    email,
    expiresAt,
    createdAt: now,
  });

  await authEmailService.sendEmailVerificationEmail({
    to: email,
    confirmUrl: buildEmailConfirmationUrl(token),
    name: user.name,
  });
};

/**
 * Registers a new user and either joins them to the invited blister or creates a personal one.
 */
export const authRegister = async (input: RegisterInput): Promise<PublicUser> => {
  await ensureUniqueCredentials(input.email, input.username);

  const targetBlister = input.inviteCode ? await findInviteTarget(input.inviteCode) : null;
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const user = await UserModel.create({
    name: input.name,
    username: input.username,
    email: input.email,
    emailVerified: false,
    pendingEmail: null,
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

  await sendEmailConfirmation(user, user.email);

  return sanitizeUser(user);
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
    throw new AppError({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);

  if (!isPasswordValid) {
    throw new AppError({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid credentials.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  assertEmailVerified(user);

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await createTokens(user._id.toString());
  await persistRefreshToken(user._id.toString(), refreshToken, refreshTokenExpiresAt);

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * Creates a short-lived password reset token and emails it when the account exists.
 */
export const authForgotPassword = async (input: ForgotPasswordInput): Promise<void> => {
  const user = await UserModel.findOne({ email: input.email, deletedAt: null });

  if (!user) {
    return;
  }

  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);

  await PasswordResetTokenModel.deleteMany({ userId: user._id.toString() });
  await PasswordResetTokenModel.create({
    tokenHash: hashValue(token),
    userId: user._id.toString(),
    expiresAt,
    createdAt: now,
  });

  await authEmailService.sendPasswordResetEmail({
    to: user.email,
    resetUrl: buildPasswordResetUrl(token),
  });
};

/**
 * Validates a reset token, replaces the user's password and consumes the token.
 */
export const authResetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const tokenHash = hashValue(input.token);
  const resetToken = await PasswordResetTokenModel.findOne({ tokenHash }).select('+tokenHash');

  if (!resetToken) {
    throw new AppError({
      code: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      message: 'Password reset token is invalid or has already been used.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  if (resetToken.expiresAt.getTime() <= Date.now()) {
    await PasswordResetTokenModel.deleteOne({ _id: resetToken._id });
    throw new AppError({
      code: 'AUTH_PASSWORD_RESET_TOKEN_EXPIRED',
      message: 'Password reset token has expired.',
      statusCode: HTTP_STATUS_GONE,
    });
  }

  const user = await UserModel.findOne({ _id: resetToken.userId, deletedAt: null });

  if (!user) {
    await PasswordResetTokenModel.deleteOne({ _id: resetToken._id });
    throw new AppError({
      code: 'AUTH_PASSWORD_RESET_TOKEN_INVALID',
      message: 'Password reset token is invalid or has already been used.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  user.password = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  user.refreshTokenHash = null;
  user.refreshTokenExpiresAt = null;

  await user.save();
  await PasswordResetTokenModel.deleteOne({ _id: resetToken._id });
};

/**
 * Confirms a registered or pending email address using a one-time token.
 */
export const authConfirmEmail = async (input: ConfirmEmailInput): Promise<PublicUser> => {
  const tokenHash = hashValue(input.token);
  const verificationToken = await EmailVerificationTokenModel.findOne({ tokenHash }).select('+tokenHash');

  if (!verificationToken) {
    throw new AppError({
      code: 'AUTH_EMAIL_CONFIRMATION_TOKEN_INVALID',
      message: 'Email confirmation token is invalid or has already been used.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  if (verificationToken.expiresAt.getTime() <= Date.now()) {
    await EmailVerificationTokenModel.deleteOne({ _id: verificationToken._id });
    throw new AppError({
      code: 'AUTH_EMAIL_CONFIRMATION_TOKEN_EXPIRED',
      message: 'Email confirmation token has expired.',
      statusCode: HTTP_STATUS_GONE,
    });
  }

  const user = await UserModel.findOne({ _id: verificationToken.userId, deletedAt: null });

  if (!user) {
    await EmailVerificationTokenModel.deleteOne({ _id: verificationToken._id });
    throw new AppError({
      code: 'AUTH_EMAIL_CONFIRMATION_TOKEN_INVALID',
      message: 'Email confirmation token is invalid or has already been used.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  const confirmsCurrentEmail = user.email === verificationToken.email;
  const confirmsPendingEmail = user.pendingEmail === verificationToken.email;

  if (!confirmsCurrentEmail && !confirmsPendingEmail) {
    await EmailVerificationTokenModel.deleteOne({ _id: verificationToken._id });
    throw new AppError({
      code: 'AUTH_EMAIL_CONFIRMATION_TOKEN_INVALID',
      message: 'Email confirmation token is invalid or has already been used.',
      statusCode: HTTP_STATUS_BAD_REQUEST,
    });
  }

  if (confirmsPendingEmail) {
    await ensureUniqueCredentials(verificationToken.email, undefined, user._id.toString());
    user.email = verificationToken.email;
    user.pendingEmail = null;
  }

  user.emailVerified = true;
  await user.save();
  await EmailVerificationTokenModel.deleteMany({
    userId: user._id.toString(),
    email: verificationToken.email,
  });

  return sanitizeUser(user);
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

  if (!Types.ObjectId.isValid(payload.sub)) {
    throw new AppError({
      code: 'AUTH_REFRESH_INVALID',
      message: 'Refresh token is invalid or expired.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const user = await UserModel.findOne({
    _id: payload.sub,
    deletedAt: null,
  }).select('+refreshTokenHash +refreshTokenExpiresAt');
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

  assertEmailVerified(storedUser);

  const { accessToken, refreshToken, refreshTokenExpiresAt } = await createTokens(storedUser._id.toString());
  await persistRefreshToken(storedUser._id.toString(), refreshToken, refreshTokenExpiresAt);

  return {
    accessToken,
    refreshToken,
  };
};

const getUserById = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError({
      code: 'AUTH_USER_NOT_FOUND',
      message: 'User not found.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

  const user = await UserModel.findOne({ _id: userId, deletedAt: null }).select('+password');

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
  const requestedEmail = input.email && input.email !== user.email ? input.email : undefined;

  await ensureUniqueCredentials(requestedEmail, input.username, userId);

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
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    await OAuthTokenModel.deleteMany({ userId });
  }

  if (input.name) {
    user.name = input.name;
  }

  if (input.username) {
    user.username = input.username;
  }

  if (requestedEmail) {
    user.pendingEmail = requestedEmail;
  }

  if (input.settings) {
    user.settings = {
      ...user.settings,
      ...input.settings,
    };
  }

  await user.save();

  if (requestedEmail) {
    await sendEmailConfirmation(user, requestedEmail);
  }

  return sanitizeUser(user);
};

/**
 * Clears the stored refresh token for the authenticated browser session.
 */
export const authLogout = async (userId: string): Promise<void> => {
  await revokeRefreshCredentials(userId);
};

/**
 * Marks a user account as deleted and revokes session, MCP and reset credentials.
 */
export const authDeleteAccount = async (userId: string): Promise<void> => {
  await UserModel.updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        deletedAt: new Date(),
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
        mcpToken: null,
        mcpTokenCreatedAt: null,
        mcpTokenExpiresAt: null,
        mcpTokenLastUsedAt: null,
      },
    },
  );

  await Promise.all([
    EmailVerificationTokenModel.deleteMany({ userId }),
    OAuthTokenModel.deleteMany({ userId }),
    PasswordResetTokenModel.deleteMany({ userId }),
    PushSubscriptionModel.deleteMany({ userId: new Types.ObjectId(userId) }),
  ]);
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

  const result = await UserModel.updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        mcpToken: hashValue(token),
        mcpTokenCreatedAt: createdAt,
        mcpTokenExpiresAt: expiresAt,
        mcpTokenLastUsedAt: null,
      },
    },
  );

  if (result.matchedCount === 0) {
    throw new AppError({
      code: 'AUTH_USER_NOT_FOUND',
      message: 'User not found.',
      statusCode: HTTP_STATUS_UNAUTHORIZED,
    });
  }

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
  const user = (await UserModel.findOne({ _id: userId, deletedAt: null }).select(MCP_TOKEN_SELECT)) as UserMcpDocument | null;

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
    { _id: userId, deletedAt: null },
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
