import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { z } from 'zod';

import { errorMiddleware } from '../error.middleware';
import { validate } from '../validate';

describe('validate middleware', () => {
  const app = express();

  app.use(express.json());
  app.post(
    '/test',
    validate({
      body: z
        .object({
          name: z.string().trim().min(2),
        })
        .strip(),
    }),
    (request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: request.body,
      });
    },
  );
  app.get(
    '/query',
    validate({
      query: z.object({
        from: z.coerce.date(),
        includeTaken: z
          .union([z.boolean(), z.enum(['true', 'false'])])
          .transform((value) => value === true || value === 'true'),
      }),
    }),
    (request: Request, response: Response) => {
      const query = request.query as unknown as { from: Date; includeTaken: boolean };
      response.status(200).json({
        success: true,
        data: {
          fromIsDate: query.from instanceof Date,
          fromTime: query.from.getTime(),
          includeTaken: query.includeTaken,
        },
      });
    },
  );
  app.use(errorMiddleware);

  it('parses and strips unknown body fields before the controller', async () => {
    const response = await request(app).post('/test').send({
      name: '  Ana  ',
      ignored: 'value',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        name: 'Ana',
      },
    });
  });

  it('returns a 400 error contract when validation fails', async () => {
    const response = await request(app).post('/test').send({
      name: 'A',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: ['name: Too small: expected string to have >=2 characters'],
      },
    });
  });

  it('preserves transformed query values before the controller', async () => {
    const response = await request(app)
      .get('/query')
      .query({ from: '2030-01-01T00:00:00.000Z', includeTaken: 'true' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        fromIsDate: true,
        fromTime: new Date('2030-01-01T00:00:00.000Z').getTime(),
        includeTaken: true,
      },
    });
  });
});
