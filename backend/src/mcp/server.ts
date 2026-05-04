import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { connectDb, disconnectDb } from '../config/db';
import { env } from '../config/env';
import {
  HTTP_STATUS_INTERNAL_SERVER_ERROR,
  HTTP_STATUS_NOT_FOUND,
} from '../constants/http.constants';
import { AppError } from '../utils/app-error';
import { createMcpServerForContext } from './tool-registry';
import { resolveMcpContextFromToken, resolveRawMcpToken } from './context';

const MCP_PATH = '/mcp';

interface McpSessionState {
  transport: StreamableHTTPServerTransport;
  userId: string;
}

const mcpSessions = new Map<string, McpSessionState>();

const sendJson = (
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: Record<string, unknown>,
): void => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new AppError({
      code: 'MCP_BODY_INVALID',
      message: 'MCP request body must be valid JSON.',
      statusCode: 400,
    });
  }
};

const handleMcpRequest = async (
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> => {
  try {
    const token = resolveRawMcpToken(request.headers);
    const context = await resolveMcpContextFromToken(token);
    const body = await readJsonBody(request);
    const sessionIdHeader = request.headers['mcp-session-id'];
    const sessionId = typeof sessionIdHeader === 'string' ? sessionIdHeader : undefined;

    if (sessionId && mcpSessions.has(sessionId)) {
      const session = mcpSessions.get(sessionId)!;

      if (session.userId !== context.userId) {
        throw new AppError({
          code: 'MCP_SESSION_FORBIDDEN',
          message: 'MCP session does not belong to this token.',
          statusCode: 403,
        });
      }

      await session.transport.handleRequest(request, response, body);
      return;
    }

    if (sessionId && !mcpSessions.has(sessionId)) {
      throw new AppError({
        code: 'MCP_SESSION_NOT_FOUND',
        message: 'MCP session not found. Re-initialize the connection.',
        statusCode: 404,
      });
    }

    if (!isInitializeRequest(body)) {
      throw new AppError({
        code: 'MCP_INITIALIZE_REQUIRED',
        message: 'Initialize request is required when no MCP session exists.',
        statusCode: 400,
      });
    }

    const server = createMcpServerForContext(context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        mcpSessions.set(newSessionId, {
          transport,
          userId: context.userId,
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        mcpSessions.delete(transport.sessionId);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch (error: unknown) {
    if (error instanceof AppError) {
      sendJson(response, error.statusCode, {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      });
      return;
    }

    sendJson(response, HTTP_STATUS_INTERNAL_SERVER_ERROR, {
      success: false,
      error: {
        code: 'MCP_INTERNAL_ERROR',
        message: 'Unexpected MCP server error.',
      },
    });
  }
};

export const createMcpHttpServer = (): Server =>
  createServer(async (request, response) => {
    if ((request.url ?? '').startsWith(MCP_PATH)) {
      await handleMcpRequest(request, response);
      return;
    }

    if (request.url === '/health') {
      sendJson(response, 200, {
        success: true,
        data: {
          status: 'ok',
        },
      });
      return;
    }

    sendJson(response, HTTP_STATUS_NOT_FOUND, {
      success: false,
      error: {
        code: 'MCP_ROUTE_NOT_FOUND',
        message: 'Route not found.',
      },
    });
  });

export const resolveMcpPort = (): number => {
  const raw = process.env.MCP_PORT;

  if (!raw) {
    return env.port + 1;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return env.port + 1;
  }

  return parsed;
};

const bootstrap = async (): Promise<void> => {
  await connectDb();
  const server = createMcpHttpServer();
  const mcpPort = resolveMcpPort();

  server.listen(mcpPort, () => {
    // eslint-disable-next-line no-console
    console.log(`Blister MCP server listening on port ${mcpPort}`);
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down MCP server.`);

    server.close(() => {
      void disconnectDb()
        .catch((dbError: unknown) => {
          // eslint-disable-next-line no-console
          console.error('Failed to close MongoDB connection for MCP server', dbError);
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
};

export const startMcpStandaloneServer = bootstrap;

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start Blister MCP server', error);
    process.exitCode = 1;
  });
}
