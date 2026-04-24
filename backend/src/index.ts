import { createServer } from 'node:http';

import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';

const app = createApp({
  clientOrigin: env.clientOrigin,
  nodeEnv: env.nodeEnv,
});

const server = createServer(app);

/**
 * Starts the HTTP server after the database connection is ready.
 */
const bootstrap = async (): Promise<void> => {
  await connectDb();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Blister backend listening on port ${env.port}`);
  });
};

void bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Blister backend', error);
  process.exitCode = 1;
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down gracefully.`);

  server.close(() => {
    void disconnectDb()
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to close MongoDB connection', error);
      })
      .finally(() => {
        process.exit();
      });
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
