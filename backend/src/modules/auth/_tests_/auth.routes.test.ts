import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { UserModel } from '../../../models/user.model';
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

  afterEach(async () => {
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
    expect(response.body.data.user.email).toBe('ana@example.com');
  });

  it('rejects duplicated email registration', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
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
    await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ana@example.com',
      password: 'Password1!',
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('rejects incorrect passwords on login', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Ana Lopez',
      username: 'analopez',
      email: 'ana@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
      privacyConsent: true,
      ageConfirmed: true,
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

  it('rejects protected routes without token', async () => {
    const response = await request(app).patch('/api/v1/auth/profile').send({
      name: 'Nuevo Nombre',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
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
});
