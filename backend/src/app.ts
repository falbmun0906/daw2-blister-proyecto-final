import cors, { type CorsOptions, type CorsOptionsDelegate } from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { API_PREFIX, AUTH_PREFIX, HEALTH_PATH } from './constants/http.constants';
import { registerSwagger } from './config/swagger';
import { JSON_BODY_LIMIT, URL_ENCODED_LIMIT } from './constants/security.constants';
import { errorMiddleware } from './middleware/error.middleware';
import { notFoundMiddleware } from './middleware/not-found.middleware';
import { handleMcpExpressRequest } from './mcp/server';
import { requestSanitizerMiddleware } from './middleware/request-sanitizer.middleware';
import { adherenceRouter } from './modules/adherence/adherence.routes';
import { appointmentsRouter } from './modules/appointments/appointments.routes';
import { authRouter } from './modules/auth/auth.routes';
import { blistersRouter } from './modules/blisters/blisters.routes';
import { externalRouter } from './modules/external/external.routes';
import { meRouter } from './modules/me/me.routes';
import { medicinesRouter } from './modules/medicines/medicines.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import {
  oauthMetadataController,
  oauthProtectedResourceMetadataController,
} from './modules/oauth/oauth.controller';
import { CLAUDE_WEB_ORIGIN } from './modules/oauth/oauth.constants';
import { oauthRouter } from './modules/oauth/oauth.routes';
import { treatmentsRouter } from './modules/treatments/treatments.routes';

export interface AppConfig {
  clientOrigins?: readonly string[];
  clientOrigin?: string;
  mcpServerEnabled?: boolean;
  nodeEnv: 'development' | 'test' | 'production';
}

const OAUTH_CORS_PATHS = [
  '/.well-known/oauth-authorization-server',
  '/.well-known/oauth-protected-resource',
  '/.well-known/openid-configuration',
  '/oauth',
];
const OAUTH_ALLOWED_CROSS_ORIGIN_ORIGINS = new Set([CLAUDE_WEB_ORIGIN]);

const isOAuthCorsPath = (path: string): boolean =>
  OAUTH_CORS_PATHS.some((oauthPath) => path === oauthPath || path.startsWith(`${oauthPath}/`));

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const isLocalhostOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);

    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

const isTrustedOAuthOrigin = (origin: string): boolean =>
  OAUTH_ALLOWED_CROSS_ORIGIN_ORIGINS.has(normalizeOrigin(origin)) || isLocalhostOrigin(origin);

const applyOAuthCrossOriginHeaders = (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (isOAuthCorsPath(request.path)) {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    response.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }

  next();
};

const createCorsOptionsDelegate = (clientOrigins: readonly string[]): CorsOptionsDelegate<Request> =>
  (request, callback) => {
    const requestOrigin = request.header('Origin');
    const allowedOrigins = new Set(clientOrigins.map(normalizeOrigin));
    const allowedOrigin = requestOrigin !== undefined && (
      allowedOrigins.has(normalizeOrigin(requestOrigin))
      || (isOAuthCorsPath(request.path) && isTrustedOAuthOrigin(requestOrigin))
    );
    const options: CorsOptions = {
      origin: requestOrigin === undefined ? true : allowedOrigin,
      credentials: true,
    };

    callback(null, options);
  };

/**
 * Creates the Express application with the mandatory global middleware chain.
 */
export const createApp = ({
  clientOrigins,
  clientOrigin,
  mcpServerEnabled = true,
  nodeEnv,
}: AppConfig): Express => {
  const allowedClientOrigins = clientOrigins ?? (clientOrigin ? [clientOrigin] : []);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          formAction: null,
        },
      },
    }),
  );
  app.use(applyOAuthCrossOriginHeaders);
  app.use(cors(createCorsOptionsDelegate(allowedClientOrigins)));

  if (mcpServerEnabled) {
    // MCP must run before global body parsers so the transport can consume the raw request stream.
    /**
     * @openapi
     * /mcp:
     *   get:
     *     summary: Open or resume a Streamable HTTP MCP session
     *     tags:
     *       - MCP
     *     servers:
     *       - url: /
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: header
     *         name: x-mcp-token
     *         schema:
     *           type: string
     *         description: Legacy Blister MCP token alternative to OAuth Bearer.
     *       - in: query
     *         name: mcp-session-id
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: MCP stream response.
     *       401:
     *         description: Missing or invalid MCP authentication.
     *   post:
     *     summary: Send a JSON-RPC MCP message
     *     tags:
     *       - MCP
     *     servers:
     *       - url: /
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *           example:
     *             jsonrpc: '2.0'
     *             id: 1
     *             method: tools/list
     *             params: {}
     *     responses:
     *       200:
     *         description: MCP JSON-RPC response or stream event.
     *       401:
     *         description: Missing or invalid MCP authentication.
     *   delete:
     *     summary: Close a Streamable HTTP MCP session
     *     tags:
     *       - MCP
     *     servers:
     *       - url: /
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: mcp-session-id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: MCP session closed.
     *       401:
     *         description: Missing or invalid MCP authentication.
     */
    app.get('/mcp', handleMcpExpressRequest);
    app.post('/mcp', handleMcpExpressRequest);
    app.delete('/mcp', handleMcpExpressRequest);
  }

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
  /**
   * @openapi
   * /.well-known/oauth-authorization-server:
   *   get:
   *     summary: OAuth 2.0 authorization server metadata for MCP clients
   *     tags:
   *       - OAuth
   *     servers:
   *       - url: /
   *     responses:
   *       200:
   *         description: RFC 8414 authorization server metadata.
   *         content:
   *           application/json:
   *             example:
   *               issuer: https://api.miblister.es
   *               authorization_endpoint: https://api.miblister.es/oauth/authorize
   *               token_endpoint: https://api.miblister.es/oauth/token
   *               registration_endpoint: https://api.miblister.es/oauth/register
   *               response_types_supported:
   *                 - code
   *               grant_types_supported:
   *                 - authorization_code
   *                 - refresh_token
   */
  app.get('/.well-known/oauth-authorization-server', oauthMetadataController);
  /**
   * @openapi
   * /.well-known/openid-configuration:
   *   get:
   *     summary: Minimal OpenID metadata for MCP client compatibility
   *     tags:
   *       - OAuth
   *     servers:
   *       - url: /
   *     responses:
   *       200:
   *         description: Discovery document compatible with strict clients.
   */
  app.get('/.well-known/openid-configuration', oauthMetadataController);
  /**
   * @openapi
   * /.well-known/oauth-protected-resource:
   *   get:
   *     summary: OAuth protected resource metadata for the MCP endpoint
   *     tags:
   *       - OAuth
   *     servers:
   *       - url: /
   *     responses:
   *       200:
   *         description: Protected resource metadata with MCP audience information.
   *         content:
   *           application/json:
   *             example:
   *               resource: https://api.miblister.es/mcp
   *               authorization_servers:
   *                 - https://api.miblister.es
   */
  app.get('/.well-known/oauth-protected-resource', oauthProtectedResourceMetadataController);
  app.use('/oauth', oauthRouter);
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
