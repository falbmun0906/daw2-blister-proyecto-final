import { Router } from 'express';

import {
  oauthAuthorizePageController,
  oauthAuthorizeSubmitController,
  oauthRegisterController,
  oauthTokenController,
} from './oauth.controller';
import { validate } from '../../middleware/validate';
import {
  attachOAuthAuthorizeBody,
  attachOAuthAuthorizeQuery,
} from './oauth.middleware';
import {
  oauthAuthorizeQuerySchema,
  oauthAuthorizeSubmitSchema,
  oauthRegisterRequestSchema,
  oauthTokenRequestSchema,
} from './oauth.schema';

export const oauthRouter = Router();

oauthRouter.get(
  '/authorize',
  validate({ query: oauthAuthorizeQuerySchema }),
  attachOAuthAuthorizeQuery,
  oauthAuthorizePageController,
);
oauthRouter.post(
  '/authorize',
  validate({ body: oauthAuthorizeSubmitSchema }),
  attachOAuthAuthorizeBody,
  oauthAuthorizeSubmitController,
);

/**
 * @openapi
 * /oauth/authorize:
 *   get:
 *     summary: Render the OAuth authorization page for MCP clients
 *     tags:
 *       - OAuth
 *     servers:
 *       - url: /
 *     parameters:
 *       - in: query
 *         name: response_type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [code]
 *         example: code
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema:
 *           type: string
 *         example: mcp-client
 *       - in: query
 *         name: redirect_uri
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         example: http://localhost:6274/oauth/callback
 *       - in: query
 *         name: code_challenge
 *         required: true
 *         schema:
 *           type: string
 *         example: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
 *       - in: query
 *         name: code_challenge_method
 *         required: true
 *         schema:
 *           type: string
 *           enum: [S256]
 *         example: S256
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *         example: mcp
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         example: client-state
 *     responses:
 *       200:
 *         description: HTML authorization form.
 *       400:
 *         description: Invalid OAuth request.
 */

/**
 * @openapi
 * /oauth/authorize:
 *   post:
 *     summary: Authenticate the user and issue an OAuth authorization code
 *     tags:
 *       - OAuth
 *     servers:
 *       - url: /
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required: [identifier, password, response_type, client_id, redirect_uri, code_challenge, code_challenge_method]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: ana@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password1!
 *               response_type:
 *                 type: string
 *                 example: code
 *               client_id:
 *                 type: string
 *                 example: mcp-client
 *               redirect_uri:
 *                 type: string
 *                 example: http://localhost:6274/oauth/callback
 *               code_challenge:
 *                 type: string
 *                 example: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
 *               code_challenge_method:
 *                 type: string
 *                 example: S256
 *               scope:
 *                 type: string
 *                 example: mcp
 *               state:
 *                 type: string
 *                 example: client-state
 *     responses:
 *       302:
 *         description: Redirect to the client callback with an authorization code.
 *       400:
 *         description: Invalid OAuth request.
 *       401:
 *         description: Invalid user credentials.
 */

/**
 * @openapi
 * /oauth/token:
 *   post:
 *     summary: Exchange an authorization code or refresh token for MCP OAuth tokens
 *     tags:
 *       - OAuth
 *     servers:
 *       - url: /
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [grant_type]
 *             properties:
 *               grant_type:
 *                 type: string
 *                 enum: [authorization_code, refresh_token]
 *                 example: authorization_code
 *               code:
 *                 type: string
 *                 example: oauth-code
 *               redirect_uri:
 *                 type: string
 *                 example: http://localhost:6274/oauth/callback
 *               client_id:
 *                 type: string
 *                 example: mcp-client
 *               code_verifier:
 *                 type: string
 *                 example: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
 *               refresh_token:
 *                 type: string
 *                 example: <oauth_refresh>
 *     responses:
 *       200:
 *         description: OAuth tokens issued.
 *         content:
 *           application/json:
 *             example:
 *               token_type: Bearer
 *               access_token: <mcp_oauth_access>
 *               refresh_token: <mcp_oauth_refresh>
 *               expires_in: 900
 *               scope: mcp
 *       400:
 *         description: Invalid OAuth token request.
 *       401:
 *         description: Invalid code, verifier or refresh token.
 */

/**
 * @openapi
 * /oauth/register:
 *   post:
 *     summary: Dynamically register an OAuth client for remote MCP access
 *     tags:
 *       - OAuth
 *     servers:
 *       - url: /
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [redirect_uris]
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: ChatGPT MCP client
 *               redirect_uris:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - http://localhost:6274/oauth/callback
 *               grant_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - authorization_code
 *                   - refresh_token
 *               scope:
 *                 type: string
 *                 example: mcp
 *     responses:
 *       201:
 *         description: Dynamic client metadata accepted.
 *         content:
 *           application/json:
 *             example:
 *               client_id: mcp-client
 *               client_name: ChatGPT MCP client
 *               redirect_uris:
 *                 - http://localhost:6274/oauth/callback
 *               grant_types:
 *                 - authorization_code
 *                 - refresh_token
 *               response_types:
 *                 - code
 *               scope: mcp
 *       400:
 *         description: Invalid registration metadata.
 */

oauthRouter.post('/token', validate({ body: oauthTokenRequestSchema }), oauthTokenController);
oauthRouter.post('/register', validate({ body: oauthRegisterRequestSchema }), oauthRegisterController);
