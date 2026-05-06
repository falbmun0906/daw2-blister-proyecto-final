import { createServer, type Server } from 'node:http';

import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import { createMcpHttpServer, resolveMcpPort } from './mcp/server';
import {
  notificationsSchedulerStart,
  notificationsSchedulerStop,
} from './modules/notifications/notifications-scheduler.service';

const app = createApp({
  clientOrigin: env.clientOrigin,
  nodeEnv: env.nodeEnv,
});

const server = createServer(app);
const mcpServer = env.mcpServerEnabled ? createMcpHttpServer() : null;

const closeServer = (target: Server | null): Promise<void> =>
  new Promise((resolve) => {
    if (!target?.listening) {
      resolve();
      return;
    }

    target.close(() => resolve());
  });

const startMcpServer = (): void => {
  if (!mcpServer) {
    return;
  }

  const mcpPort = resolveMcpPort();

  mcpServer.on('error', (error: Error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start Blister MCP server', error);
  });

  mcpServer.listen(mcpPort, () => {
    // eslint-disable-next-line no-console
    console.log(`Blister MCP server listening on port ${mcpPort}`);
  });
};

/**
 * Starts the HTTP server after the database connection is ready.
 */
const bootstrap = async (): Promise<void> => {
  await connectDb();

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Blister backend listening on port ${env.port}`);
  });
  startMcpServer();
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

  await Promise.all([closeServer(server), closeServer(mcpServer)]);
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
