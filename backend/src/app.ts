import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { API_PREFIX, AUTH_PREFIX, HEALTH_PATH } from './constants/http.constants';
import { registerSwagger } from './config/swagger';
import { JSON_BODY_LIMIT, URL_ENCODED_LIMIT } from './constants/security.constants';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { requestSanitizerMiddleware } from './middleware/request-sanitizer.middleware';
import { adherenceRouter } from './modules/adherence/adherence.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { authRouter } from './modules/auth/auth.routes';
import { blistersRouter } from './modules/blisters/blisters.routes';
import { externalRouter } from './modules/external/external.routes';
import { meRouter } from './modules/me/me.routes';
import { medicinesRouter } from './modules/medicines/medicines.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { treatmentsRouter } from './modules/treatments/treatments.routes';

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
  registerSwagger(app);
  app.use(`${API_PREFIX}${AUTH_PREFIX}`, authRouter);
  app.use(`${API_PREFIX}/blisters`, blistersRouter);
  app.use(`${API_PREFIX}/blisters`, medicinesRouter);
  app.use(`${API_PREFIX}/blisters`, treatmentsRouter);
  app.use(`${API_PREFIX}/blisters`, appointmentsRouter);
  app.use(`${API_PREFIX}/blisters`, adherenceRouter);
  app.use(`${API_PREFIX}/blisters/:blisterId/external`, externalRouter);
  app.use(`${API_PREFIX}/external`, externalRouter);
  app.use(`${API_PREFIX}/notifications`, notificationsRouter);
  app.use(`${API_PREFIX}/me`, meRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
