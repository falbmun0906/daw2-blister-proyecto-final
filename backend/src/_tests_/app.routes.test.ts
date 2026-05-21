import request from 'supertest';

import { createApp } from '../app';

describe('app infrastructure', () => {
  const app = createApp({
    clientOrigins: ['http://localhost:5173', 'https://miblister.es'],
    nodeEnv: 'test',
  });

  it('returns the health status using the standard success contract', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
    });
  });

  it('returns the standard error contract for unknown routes', async () => {
    const response = await request(app).get('/api/v1/missing-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /api/v1/missing-route was not found.',
      },
    });
  });

  it('allows configured origins during CORS preflight requests', async () => {
    const response = await request(app)
      .options('/api/v1/auth/register')
      .set('Origin', 'https://miblister.es')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://miblister.es');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('keeps strict cross-origin policies on non-OAuth routes', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
  });

  it('exposes the generated OpenAPI specification', async () => {
    const response = await request(app).get('/api/v1/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths).toEqual(expect.objectContaining({
      '/.well-known/oauth-authorization-server': expect.any(Object),
      '/.well-known/openid-configuration': expect.any(Object),
      '/.well-known/oauth-protected-resource': expect.any(Object),
      '/auth/register': expect.any(Object),
      '/auth/forgot-password': expect.any(Object),
      '/auth/reset-password': expect.any(Object),
      '/auth/confirm-email': expect.any(Object),
      '/auth/logout': expect.any(Object),
      '/auth/account': expect.any(Object),
      '/blisters/{blisterId}/medicines': expect.any(Object),
      '/mcp': expect.any(Object),
      '/notifications': expect.any(Object),
      '/notifications/push/config': expect.any(Object),
      '/notifications/push/subscriptions': expect.any(Object),
      '/oauth/authorize': expect.any(Object),
      '/oauth/register': expect.any(Object),
      '/oauth/token': expect.any(Object),
    }));
    expect(response.body.paths['/auth/register'].post.requestBody.content['application/json'].schema.properties.email.example)
      .toBe('ana@example.com');
    expect(response.body.paths['/notifications/push/subscriptions'].post.requestBody.content['application/json'].schema.properties.endpoint.example)
      .toContain('https://fcm.googleapis.com');
  });
});
