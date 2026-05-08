import { createServer, type Server } from 'node:http';

import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import {
  notificationsSchedulerStart,
  notificationsSchedulerStop,
} from './modules/notifications/notifications-scheduler.service';

const app = createApp({
  clientOrigin: env.clientOrigin,
  mcpServerEnabled: env.mcpServerEnabled,
  nodeEnv: env.nodeEnv,
});

const server = createServer(app);

const closeServer = (target: Server | null): Promise<void> =>
  new Promise((resolve) => {
    if (!target?.listening) {
      resolve();
      return;
    }

    target.close(() => resolve());
  });

/**
 * Starts the HTTP server after the database connection is ready.
 */
const bootstrap = async (): Promise<void> => {
  await connectDb();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Blister backend listening on port ${env.port}`);
  });
  notificationsSchedulerStart();
};

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Blister backend', error);
  process.exitCode = 1;
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down gracefully.`);

  await closeServer(server);
  notificationsSchedulerStop();
  await disconnectDb().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to close MongoDB connection', error);
  });
  process.exit();
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
