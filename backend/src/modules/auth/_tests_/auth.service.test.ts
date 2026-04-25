import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import { env } from '../../../config/env';
import { BlisterModel } from '../../../models/blister.model';
import { UserModel } from '../../../models/user.model';
import {
  authCreateMcpToken,
  authLogin,
  authRefresh,
  authRegister,
} from '../auth.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from './auth-test.utils';

describe('auth.service', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
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

  it('creates hashed MCP tokens without storing the clear text value', async () => {
    const registerResult = await authRegister({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    const mcpTokenResult = await authCreateMcpToken(registerResult.user.id, {});
    const storedUser = await UserModel.findById(registerResult.user.id).select('+mcpToken');

    expect(mcpTokenResult.token).toHaveLength(64);
    expect(storedUser?.mcpToken).toBeTruthy();
    expect(storedUser?.mcpToken).not.toBe(mcpTokenResult.token);
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
    });

    const result = await authLogin({
      identifier: 'analopez',
      password: 'Password1!',
    });

    expect(result.user.email).toBe('ana@example.com');
    expect(result.accessToken).toBeTruthy();
  });
});
