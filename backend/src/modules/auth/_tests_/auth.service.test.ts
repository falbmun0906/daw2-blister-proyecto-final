import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { UserModel } from '../../../models/user.model';
import {
  authCreateMcpToken,
  authGetMcpTokenStatus,
  authLogin,
  authLogout,
  authRefresh,
  authRegister,
  authUpdateProfile,
} from '../auth.service';
import * as authEmailService from '../auth-email.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from './auth-test.utils';

describe('auth.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  beforeEach(() => {
    jest.spyOn(authEmailService, 'sendEmailVerificationEmail').mockResolvedValue(undefined);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('hashes passwords and issues access and refresh tokens on register', async () => {
    const result = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    const storedUser = await UserModel.findOne({ email: 'ana@example.com' })
      .select('+password +refreshTokenHash +refreshTokenExpiresAt');

    expect(storedUser).not.toBeNull();
    expect(storedUser?.password).not.toBe('Password1!');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(storedUser?.refreshTokenHash).toBeTruthy();
    expect(storedUser?.refreshTokenExpiresAt).toBeInstanceOf(Date);
  });

  it('creates a personal blister only when register has no invite code', async () => {
    const inviteBlister = await BlisterModel.create({
      name: 'Casa Abuela',
      members: [
        {
          userId: new Types.ObjectId(),
          role: 'OWNER',
        },
      ],
      inviteCode: {
        code: 'ABC123',
        exp: new Date(Date.now() + 60_000),
        role: 'CAREGIVER',
      },
    });

    await authRegister({
      name: 'Invitado',
      username: 'invitado',
      email: 'invitado@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: 'ABC123',
    });

    const blisters = await BlisterModel.find();
    const updatedInviteBlister = await BlisterModel.findById(inviteBlister._id);

    expect(blisters).toHaveLength(1);
    expect(updatedInviteBlister?.members).toHaveLength(2);
    expect(updatedInviteBlister?.inviteCode).toBeNull();
  });

  it('rotates refresh tokens and validates their payloads', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    const refreshed = await authRefresh({
      refreshToken: registerResult.refreshToken,
    });

    const accessPayload = jwt.verify(refreshed.accessToken, env.jwtSecret) as { type: string };
    const refreshPayload = jwt.verify(refreshed.refreshToken, env.jwtSecret) as { type: string };

    expect(accessPayload.type).toBe('access');
    expect(refreshPayload.type).toBe('refresh');
    expect(refreshed.refreshToken).not.toBe(registerResult.refreshToken);
  });

  it('rejects refresh tokens for deleted users', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    await UserModel.updateOne({ _id: registerResult.user.id }, { $set: { deletedAt: new Date() } });

    await expect(authRefresh({ refreshToken: registerResult.refreshToken })).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });
  });

  it('revokes refresh credentials on logout and password changes', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    await authLogout(registerResult.user.id);
    await expect(authRefresh({ refreshToken: registerResult.refreshToken })).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });

    const loginResult = await authLogin({
      identifier: 'ana@example.com',
      password: 'Password1!',
    });

    await authUpdateProfile(loginResult.user.id, {
      currentPassword: 'Password1!',
      newPassword: 'NewPassword1!',
    });

    await expect(authRefresh({ refreshToken: loginResult.refreshToken })).rejects.toMatchObject({
      code: 'AUTH_REFRESH_INVALID',
    });
  });

  it('creates hashed MCP tokens without storing the clear text value', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    const mcpTokenResult = await authCreateMcpToken(registerResult.user.id, {});
    const storedUser = await UserModel.findById(registerResult.user.id)
      .select('+mcpToken +mcpTokenCreatedAt +mcpTokenExpiresAt');

    expect(mcpTokenResult.token).toHaveLength(64);
    expect(mcpTokenResult.createdAt).toBeInstanceOf(Date);
    expect(mcpTokenResult.expiresAt).toBeInstanceOf(Date);
    expect(storedUser?.mcpToken).toBeTruthy();
    expect(storedUser?.mcpTokenCreatedAt).toBeInstanceOf(Date);
    expect(storedUser?.mcpTokenExpiresAt).toBeInstanceOf(Date);
    expect(storedUser?.mcpToken).not.toBe(mcpTokenResult.token);
  });

  it('returns MCP token status without exposing the clear text value', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    const mcpTokenResult = await authCreateMcpToken(registerResult.user.id, { expiresInDays: 1 });
    const status = await authGetMcpTokenStatus(registerResult.user.id);

    expect(status).toMatchObject({
      hasToken: true,
      lastUsedAt: null,
    });
    expect(status.createdAt?.toISOString()).toBe(mcpTokenResult.createdAt.toISOString());
    expect(status.expiresAt?.toISOString()).toBe(mcpTokenResult.expiresAt.toISOString());
  });

  it('authenticates existing users with username or email', async () => {
    await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
      inviteCode: undefined,
    });

    const result = await authLogin({
      identifier: 'analopez',
      password: 'Password1!',
    });

    expect(result.user.email).toBe('ana@example.com');
    expect(result.accessToken).toBeTruthy();
  });
});
