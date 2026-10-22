import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../src/app';
import * as authEmailService from '../../../src/modules/auth/auth-email.service';
import { clearTestDatabase, connectTestDatabase, disconnectTestDatabase } from '../../../src/modules/auth/_tests_/auth-test.utils';

const app = createApp({
  clientOrigin: 'http://localhost:5173',
  nodeEnv: 'test',
});

describe('REST auth e2e', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const registerPayload = {
    name: 'Maria Gomez',
    username: 'mariagomez',
    email: 'maria@example.com',
    password: 'Blister#123',
    confirmPassword: 'Blister#123',
    privacyConsent: true,
    ageConfirmed: true,
  };

  it('registers, logs in and protects authenticated routes', async () => {
    const mail = jest.spyOn(authEmailService, 'sendEmailVerificationEmail').mockResolvedValue(undefined);
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.emailVerified).toBe(false);
    expect(registerResponse.body.data.accessToken).toBeUndefined();
    expect(registerResponse.body.data.refreshToken).toBeUndefined();
    const unverifiedLogin = await request(app).post('/api/v1/auth/login').send({
      identifier: registerPayload.email, password: registerPayload.password,
    });
    expect(unverifiedLogin.status).toBe(403);
    const token = new URL(mail.mock.calls[0][0].confirmUrl).searchParams.get('token');
    const confirmation = await request(app).post('/api/v1/auth/confirm-email').send({ token });
    expect(confirmation.status).toBe(200);

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      identifier: registerPayload.email,
      password: registerPayload.password,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.accessToken).toBeTruthy();

    const protectedResponse = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
      .send({
        name: 'Maria Updated',
      });

    expect(protectedResponse.status).toBe(200);
    expect(protectedResponse.body.data.name).toBe('Maria Updated');

    const invalidJwtResponse = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .send({
        name: 'Nope',
      });

    expect(invalidJwtResponse.status).toBe(401);
    expect(invalidJwtResponse.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('rejects routes with a signed token for a different secret', async () => {
    const token = jwt.sign(
      {
        sub: '507f1f77bcf86cd799439011',
        type: 'access',
      },
      'another-secret-with-enough-length-123456',
      {
        expiresIn: '15m',
      },
    );

    const response = await request(app)
      .get('/api/v1/blisters')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });
});
