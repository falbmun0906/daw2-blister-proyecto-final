import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { API_PREFIX, HEALTH_PATH } from './constants/http.constants';
import { JSON_BODY_LIMIT, URL_ENCODED_LIMIT } from './constants/security.constants';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { requestSanitizerMiddleware } from './middleware/request-sanitizer.middleware';

export interface AppConfig {
  clientOrigin: string;
  nodeEnv: 'development' | 'test' | 'production';
}

/**
 * Creates the Express application with the mandatory global middleware chain.
 */
export const createApp = ({ clientOrigin, nodeEnv }: AppConfig): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: URL_ENCODED_LIMIT }));
  app.use(requestSanitizerMiddleware);

  if (nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  app.get(`${API_PREFIX}${HEALTH_PATH}`, (_request: Request, response: Response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok',
      },
    });
  });

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
