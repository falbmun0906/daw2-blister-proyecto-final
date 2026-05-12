import type { Request, Response } from 'express';

import { HTTP_STATUS_OK } from '../../constants/http.constants';
import { OAUTH_SCOPE } from './oauth.constants';
import { type OAuthAuthorizeLocals } from './oauth.middleware';
import {
  createAuthorizationCode,
  exchangeOAuthToken,
  registerOAuthClient,
  validateAuthorizeQuery,
} from './oauth.service';

const getIssuer = (request: Request): string =>
  `${request.protocol}://${request.get('host')}`;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderAuthorizePage = (
  params: ReturnType<typeof validateAuthorizeQuery>,
  errorMessage?: string,
): string => {
  const hiddenInputs = Object.entries(params)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`)
    .join('\n');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Autorizar asistente - Blister</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #eef7f5; color: #12312d; }
      main { width: min(92vw, 28rem); padding: 2rem; background: #fff; border: 1px solid #c9ddd8; border-radius: 0.5rem; box-shadow: 0 1rem 2.5rem rgba(18, 49, 45, 0.12); }
      h1 { margin: 0 0 0.5rem; font-size: 1.5rem; }
      p { line-height: 1.5; }
      label { display: grid; gap: 0.35rem; margin-top: 1rem; font-weight: 600; }
      input[type="text"], input[type="password"] { min-height: 2.75rem; border: 1px solid #9fbdb7; border-radius: 0.375rem; padding: 0 0.75rem; font: inherit; }
      .consent { grid-template-columns: auto 1fr; align-items: start; font-weight: 500; }
      .error { color: #8a1f17; background: #fff1ef; border: 1px solid #ffc9c2; padding: 0.75rem; border-radius: 0.375rem; }
      button { width: 100%; margin-top: 1.25rem; min-height: 2.75rem; border: 0; border-radius: 0.375rem; background: #087f75; color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
    </style>
  </head>
  <body>
    <main>
      <h1>Autorizar asistente</h1>
      <p>Claude Desktop solicita acceso MCP a Blister para consultar y actualizar tus datos segun tus permisos.</p>
      ${errorMessage ? `<p class="error">${escapeHtml(errorMessage)}</p>` : ''}
      <form method="post" action="/oauth/authorize">
        ${hiddenInputs}
        <label>
          Usuario o email
          <input name="identifier" type="text" autocomplete="username" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <label class="consent">
          <input name="consent" type="checkbox" required />
          <span>Permitir que Claude Desktop use el endpoint MCP de Blister con mi cuenta.</span>
        </label>
        <button type="submit">Autorizar conexión</button>
      </form>
    </main>
  </body>
</html>`;
};

/**
 * Returns OAuth authorization-server metadata for MCP clients.
 */
export const oauthMetadataController = (request: Request, response: Response): void => {
  const issuer = getIssuer(request);

  response.status(HTTP_STATUS_OK).json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [OAUTH_SCOPE],
  });
};

/**
 * Returns protected-resource metadata for the MCP endpoint.
 */
export const oauthProtectedResourceMetadataController = (request: Request, response: Response): void => {
  const issuer = getIssuer(request);

  response.status(HTTP_STATUS_OK).json({
    resource: `${issuer}/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: [OAUTH_SCOPE],
  });
};

/**
 * Renders the OAuth login and consent page with validated hidden parameters.
 */
export const oauthAuthorizePageController = (
  _request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
): void => {
  response.status(HTTP_STATUS_OK).type('html').send(renderAuthorizePage(response.locals.oauthAuthorizeInput));
};

/**
 * Validates user credentials and redirects the OAuth client with an authorization code.
 */
export const oauthAuthorizeSubmitController = async (
  request: Request,
  response: Response<unknown, OAuthAuthorizeLocals>,
): Promise<void> => {
  try {
    const result = await createAuthorizationCode(request.body);
    response.redirect(302, result.redirectUri);
  } catch (error: unknown) {
    if (error instanceof Error) {
      response
        .status(HTTP_STATUS_OK)
        .type('html')
        .send(renderAuthorizePage(response.locals.oauthAuthorizeInput, error.message));
      return;
    }

    throw error;
  }
};

/**
 * Exchanges OAuth authorization codes or refresh tokens for MCP access tokens.
 */
export const oauthTokenController = async (request: Request, response: Response): Promise<void> => {
  const result = await exchangeOAuthToken(request.body);
  response.status(HTTP_STATUS_OK).json(result);
};

/**
 * Registers the public MCP OAuth client metadata used by external clients.
 */
export const oauthRegisterController = (request: Request, response: Response): void => {
  const result = registerOAuthClient(request.body);
  response.status(201).json(result);
};
