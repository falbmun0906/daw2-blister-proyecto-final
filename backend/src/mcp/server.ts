import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import { type NextFunction, type Request, type Response } from 'express';
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
import { mcpRequestToken, resolveMcpRequestContext } from './request-context';

const MCP_PATH = '/mcp';

interface McpSessionState {
  transport: StreamableHTTPServerTransport;
  close: () => Promise<void>;
  userId: string;
  lastUsedAt: number;
}

const mcpSessions = new Map<string, McpSessionState>();
const initializingUsers = new Map<string, number>();
const MAX_BODY_BYTES = 256 * 1024;
const MAX_SESSIONS = 256;
const MAX_USER_SESSIONS = 8;
const SESSION_IDLE_MS = 15 * 60 * 1000;

export const closeMcpSessions = async (): Promise<void> => {
  const sessions = [...mcpSessions.values()];
  mcpSessions.clear();
  await Promise.allSettled(sessions.map((session) => session.close()));
};

const sessionCleanupTimer = setInterval(() => {
  for (const [id, session] of mcpSessions) {
    if (Date.now() - session.lastUsedAt > SESSION_IDLE_MS) {
      mcpSessions.delete(id);
      void session.close().catch(() => undefined);
    }
  }
}, 60_000);
sessionCleanupTimer.unref();

const sendJson = (
  response: ServerResponse<IncomingMessage>,
  statusCode: number,
  payload: Record<string, unknown>,
): void => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
};

const setMcpAuthChallenge = (
  response: ServerResponse<IncomingMessage>,
): void => {
  response.setHeader(
    'WWW-Authenticate',
    `Bearer realm="Blister MCP", resource_metadata="${env.backendUrl}/.well-known/oauth-protected-resource"`,
  );
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const tooLarge = () => new AppError({ code: 'MCP_BODY_TOO_LARGE', message: 'MCP request body exceeds 256 KiB.', statusCode: 413 });
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) {
    request.resume();
    throw tooLarge();
  }
  const rawBody = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', finish);
      request.off('aborted', onAborted);
      if (error) { request.resume(); reject(error); }
      else resolve(Buffer.concat(chunks).toString('utf8').trim());
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) finish(tooLarge());
      else chunks.push(chunk);
    };
    const onEnd = () => finish();
    const onAborted = () => finish(new AppError({ code: 'MCP_BODY_ABORTED', message: 'Request interrupted.', statusCode: 400 }));
    const timer = setTimeout(() => finish(new AppError({ code: 'MCP_BODY_TIMEOUT', message: 'Request body timed out.', statusCode: 408 })), 15_000);
    timer.unref();
    request.on('data', onData);
    request.once('end', onEnd);
    request.once('error', finish);
    request.once('aborted', onAborted);
  });

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

      session.lastUsedAt = Date.now();
      await mcpRequestToken.run(token, () => session.transport.handleRequest(request, response, body));
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

    const pending = initializingUsers.get(context.userId) ?? 0;
    const owned = [...mcpSessions.values()].filter((session) => session.userId === context.userId).length;
    const pendingTotal = [...initializingUsers.values()].reduce((sum, count) => sum + count, 0);
    if (owned + pending >= MAX_USER_SESSIONS || mcpSessions.size + pendingTotal >= MAX_SESSIONS) {
      throw new AppError({ code: 'MCP_SESSION_LIMIT', message: 'Too many MCP sessions. Close an existing session.', statusCode: 429 });
    }
    initializingUsers.set(context.userId, pending + 1);
    const server = createMcpServerForContext(resolveMcpRequestContext);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        mcpSessions.set(newSessionId, {
          transport,
          close: () => server.close(),
          userId: context.userId,
          lastUsedAt: Date.now(),
        });
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        mcpSessions.delete(transport.sessionId);
      }
    };

    try {
      await server.connect(transport);
      await mcpRequestToken.run(token, () => transport.handleRequest(request, response, body));
      if (!transport.sessionId) await server.close();
    } catch (error) {
      await server.close().catch(() => undefined);
      throw error;
    } finally {
      const remaining = (initializingUsers.get(context.userId) ?? 1) - 1;
      if (remaining > 0) initializingUsers.set(context.userId, remaining);
      else initializingUsers.delete(context.userId);
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      if (error.statusCode === 401) {
        setMcpAuthChallenge(response);
      }

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

export const handleMcpExpressRequest = async (
  request: Request,
  response: Response,
  next?: NextFunction,
): Promise<void> => {
  try {
    await handleMcpRequest(request, response);
  } catch (error: unknown) {
    next?.(error);
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
    console.log(`Blister MCP standalone server listening on port ${mcpPort}`);
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Shutting down MCP server.`);

    await closeMcpSessions();
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

/**
 * Deprecated standalone MCP entrypoint kept only for local development.
 * Production traffic should use the main Express server on /mcp.
 */
export const startMcpStandaloneServer = bootstrap;

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start Blister MCP server', error);
    process.exitCode = 1;
  });
}
