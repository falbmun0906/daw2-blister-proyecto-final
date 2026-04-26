import { createServer, type Server } from 'node:http';

import { type AddressInfo } from 'node:net';

import { createMcpHttpServer } from '../../src/mcp/server';

export const startMcpTestServer = async (): Promise<{ server: Server; baseUrl: string; stop: () => Promise<void> }> => {
  const server = createMcpHttpServer();

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}/mcp`;

  return {
    server,
    baseUrl,
    stop: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
};
