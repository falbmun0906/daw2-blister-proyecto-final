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

  it('exposes the generated OpenAPI specification', async () => {
    const response = await request(app).get('/api/v1/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/auth/register']).toBeDefined();
    expect(response.body.paths['/blisters/{blisterId}/medicines']).toBeDefined();
    expect(response.body.paths['/notifications']).toBeDefined();
  });
});
