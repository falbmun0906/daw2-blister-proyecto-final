import path from 'node:path';

import type { Express } from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { API_PREFIX } from '../constants/http.constants';

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Blister API',
      version: '1.0.0',
      description: 'Backend API for the Blister family medicine management project.',
    },
    servers: [
      {
        url: API_PREFIX,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {},
            meta: {
              type: 'object',
              nullable: true,
            },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Request validation failed.',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        PaginationMeta: {
          type: 'object',
          required: ['page', 'limit', 'total', 'totalPages'],
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            total: {
              type: 'integer',
              example: 42,
            },
            totalPages: {
              type: 'integer',
              example: 3,
            },
          },
        },
        Notification: {
          type: 'object',
          required: [
            'id',
            'userId',
            'blisterId',
            'type',
            'severity',
            'title',
            'message',
            'metadata',
            'isRead',
            'createdAt',
          ],
          properties: {
            id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            userId: {
              type: 'string',
              example: '507f1f77bcf86cd799439012',
            },
            blisterId: {
              type: 'string',
              nullable: true,
              example: '507f1f77bcf86cd799439013',
            },
            type: {
              type: 'string',
              enum: ['stock_low', 'expiration_warning', 'adherence_forced', 'cima_change', 'system'],
            },
            severity: {
              type: 'string',
              enum: ['info', 'warning', 'critical'],
            },
            title: {
              type: 'string',
              example: 'Stock bajo',
            },
            message: {
              type: 'string',
              example: 'El medicamento Paracetamol ha alcanzado el umbral minimo de stock.',
            },
            metadata: {
              type: 'object',
              nullable: true,
              additionalProperties: true,
            },
            isRead: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../modules/**/*.routes.ts'),
    path.join(__dirname, '../modules/**/*.routes.js'),
  ],
});

/**
 * Registers the generated OpenAPI spec and the interactive Swagger UI.
 */
export const registerSwagger = (app: Express): void => {
  app.get(`${API_PREFIX}/docs.json`, (_request, response) => {
    response.status(200).json(swaggerSpec);
  });

  app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
