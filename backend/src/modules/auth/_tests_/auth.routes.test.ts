import { createHash } from 'node:crypto';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { PasswordResetTokenModel } from '../../../models/passwordResetToken.model';
import { UserModel } from '../../../models/user.model';
import * as authEmailService from '../auth-email.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from './auth-test.utils';

describe('auth.routes', () => {
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    nodeEnv: 'test',
  });

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

  it('registers a user successfully', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('ana@example.com');
    expect(response.body.data.emailVerified).toBe(false);
    expect(response.body.data.accessToken).toBeUndefined();
  });

  it('sends and consumes email confirmation tokens after registration', async () => {
    const sendVerificationEmailSpy = jest.mocked(authEmailService.sendEmailVerificationEmail);

    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    const confirmUrl = sendVerificationEmailSpy.mock.calls[0]?.[0].confirmUrl;
    const token = confirmUrl ? new URL(confirmUrl).searchParams.get('token') : null;
    const confirmResponse = await request(app).post('/api/v1/auth/confirm-email').send({ token });
    const storedUser = await UserModel.findOne({ email: 'ana@example.com' });

    expect(registerResponse.status).toBe(201);
    expect(sendVerificationEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        name: 'Ana Lopez',
      }),
    );
    expect(token).toBeTruthy();
    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.data.emailVerified).toBe(true);
    expect(storedUser?.emailVerified).toBe(true);
  });

  it('rejects duplicated email registration', async () => {
    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez 2',
      username: 'analopez2',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('AUTH_EMAIL_CONFLICT');
  });

  it('rejects invalid registration fields', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: 'A',
      username: 'aa',
      email: 'invalid',
      password: 'short',
      confirmPassword: 'short',
      privacyConsent: false,
      ageConfirmed: false,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with valid credentials', async () => {
    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      emailVerified: true,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'Password1!',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('rejects unconfirmed users on login', async () => {
    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      emailVerified: false,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'Password1!',
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_EMAIL_NOT_VERIFIED');
  });

  it('revokes the stored refresh token on logout', async () => {
    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      emailVerified: true,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'Password1!',
    });
    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);
    const refreshResponse = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: loginResponse.body.data.refreshToken,
    });

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({ success: true, data: null });
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error.code).toBe('AUTH_REFRESH_INVALID');
  });

  it('rejects incorrect passwords on login', async () => {
    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'Password2!',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects nonexistent users on login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'missing@example.com',
      password: 'Password1!',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('returns the same response for existing and missing password reset emails', async () => {
    const sendEmailSpy = jest
      .spyOn(authEmailService, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);

    await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const existingResponse = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'ana@example.com',
    });
    const missingResponse = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'missing@example.com',
    });

    expect(existingResponse.status).toBe(200);
    expect(existingResponse.body).toEqual({ success: true, data: null });
    expect(missingResponse.status).toBe(200);
    expect(missingResponse.body).toEqual(existingResponse.body);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('resets a password with a valid token and consumes it', async () => {
    const sendEmailSpy = jest
      .spyOn(authEmailService, 'sendPasswordResetEmail')
      .mockResolvedValue(undefined);

    await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'ana@example.com',
    });

    const resetUrl = sendEmailSpy.mock.calls[0]?.[0].resetUrl;
    const token = resetUrl ? new URL(resetUrl).searchParams.get('token') : null;
    expect(token).toBeTruthy();

    const resetResponse = await request(app).post('/api/v1/auth/reset-password').send({
      token,
      password: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });
    await UserModel.updateOne({ email: 'ana@example.com' }, { $set: { emailVerified: true } });
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'NewPassword1!',
    });
    const reusedResponse = await request(app).post('/api/v1/auth/reset-password').send({
      token,
      password: 'OtherPassword1!',
      confirmPassword: 'OtherPassword1!',
    });

    expect(resetResponse.status).toBe(200);
    expect(loginResponse.status).toBe(200);
    expect(reusedResponse.status).toBe(400);
    expect(reusedResponse.body.error.code).toBe('AUTH_PASSWORD_RESET_TOKEN_INVALID');
  });

  it('rejects expired reset tokens', async () => {
    const user = await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });
    const token = 'expired-reset-token-with-enough-length';
    await PasswordResetTokenModel.create({
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user._id.toString(),
      expiresAt: new Date(Date.now() - 60_000),
    });

    const response = await request(app).post('/api/v1/auth/reset-password').send({
      token,
      password: 'NewPassword1!',
      confirmPassword: 'NewPassword1!',
    });

    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe('AUTH_PASSWORD_RESET_TOKEN_EXPIRED');
  });

  it('rejects invalid reset passwords before consuming a token', async () => {
    const response = await request(app).post('/api/v1/auth/reset-password').send({
      token: 'valid-looking-token-with-enough-length',
      password: 'short',
      confirmPassword: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects protected routes without token', async () => {
    const response = await request(app).patch('/api/v1/auth/profile').send({
      name: 'Nuevo Nombre',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('keeps profile email pending until the new address is confirmed', async () => {
    const sendVerificationEmailSpy = jest.mocked(authEmailService.sendEmailVerificationEmail);

    const user = await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: await bcrypt.hash('Password1!', 12),
      emailVerified: true,
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });
    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );
    sendVerificationEmailSpy.mockClear();

    const updateResponse = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'ana.new@example.com' });
    const confirmUrl = sendVerificationEmailSpy.mock.calls[0]?.[0].confirmUrl;
    const token = confirmUrl ? new URL(confirmUrl).searchParams.get('token') : null;
    const confirmResponse = await request(app).post('/api/v1/auth/confirm-email').send({ token });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.email).toBe('ana@example.com');
    expect(updateResponse.body.data.pendingEmail).toBe('ana.new@example.com');
    expect(sendVerificationEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana.new@example.com',
        name: 'Ana Lopez',
      }),
    );
    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.data.email).toBe('ana.new@example.com');
    expect(confirmResponse.body.data.pendingEmail).toBeNull();
    expect(confirmResponse.body.data.emailVerified).toBe(true);
  });

  it('rejects protected routes with expired token', async () => {
    const user = await UserModel.create({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password:
        '$2b$12$123456789012345678901uY7LwQ3xVw2Cl5EKeosFVJeFt3PcTJS.',
      settings: {
        theme: 'system',
        font: 'standard',
        fontSize: 'normal',
      },
    });

    const expiredToken = jwt.sign(
      {
        sub: user._id.toString(),
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '-1s',
      },
    );

    const response = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({
        name: 'Nuevo Nombre',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects signed access tokens with malformed user ids', async () => {
    const malformedUserToken = jwt.sign(
      {
        sub: 'not-an-object-id',
        type: 'access',
      },
      env.jwtSecret,
      {
        expiresIn: '15m',
      },
    );

    const response = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${malformedUserToken}`)
      .send({
        name: 'Nuevo Nombre',
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });
});
