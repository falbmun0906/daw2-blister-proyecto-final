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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Overpass:wght@300..700&family=Nunito:wght@400..700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --color-bg: #f5f5f5;
        --color-surface: #ffffff;
        --color-border: #cddbda;
        --color-border-subtle: rgba(30, 102, 96, 0.10);
        --color-text: #3b3b3b;
        --color-text-muted: #6b7a79;
        --color-text-on-primary: #ffffff;
        --color-primary-hover: #174f4a;
        --color-primary-active: #0f3835;
        --color-primary-mid: #11a498;
        --color-primary-tint: #edf4f3;
        --color-accent: #d97757;
        --color-error: #d54d4d;
        --color-error-subtle: #ffe6e6;
        --font-display: 'Overpass', system-ui, sans-serif;
        --font-body: 'Nunito', system-ui, sans-serif;
        --font-weight-regular: 400;
        --font-weight-medium: 500;
        --font-weight-semibold: 600;
        --text-sm: clamp(0.875rem, 0.8rem + 0.35vw, 1rem);
        --text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
        --text-xl: clamp(1.375rem, 1.2rem + 0.75vw, 1.75rem);
        --leading-tight: 1.2;
        --leading-normal: 1.55;
        --space-2: 0.5rem;
        --space-3: 0.75rem;
        --space-4: 1rem;
        --space-5: 1.25rem;
        --space-6: 1.5rem;
        --space-8: 2rem;
        --space-10: 2.5rem;
        --space-input-y: 0.875rem;
        --space-touch-min: 2.75rem;
        --radius-md: 0.625rem;
        --radius-lg: 0.875rem;
        --radius-full: 9999px;
        --shadow-card-soft: 0 0.875rem 2.5rem rgba(15, 56, 53, 0.10);
        --transition-fast: 120ms cubic-bezier(0.16, 1, 0.3, 1);
        --transition-base: 180ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: var(--space-6);
        background: var(--color-bg);
        color: var(--color-text);
        font-family: var(--font-body);
      }

      .c-oauth-authorize {
        width: min(100%, 28rem);
        display: grid;
        gap: var(--space-4);
      }

      .c-oauth-authorize__title {
        margin: 0;
        max-width: 22rem;
        font-family: var(--font-display);
        font-size: var(--text-xl);
        font-weight: var(--font-weight-medium);
        font-stretch: 96%;
        line-height: var(--leading-tight);
        color: var(--color-text);
      }

      .c-oauth-authorize__title-accent { color: var(--color-accent); }

      .c-card {
        padding: var(--space-8);
        border: 0.0625rem solid var(--color-border-subtle);
        border-radius: var(--radius-lg);
        background: var(--color-surface);
        box-shadow: var(--shadow-card-soft);
      }

      .c-oauth-authorize__intro {
        margin: 0 0 var(--space-6);
        color: var(--color-text-muted);
        font-size: var(--text-base);
        line-height: var(--leading-normal);
      }

      .c-oauth-authorize__form {
        display: grid;
        gap: var(--space-5);
      }

      .c-field {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .c-field__label {
        color: var(--color-primary-mid);
        font-size: var(--text-base);
        font-weight: var(--font-weight-regular);
      }

      .c-field__input {
        width: 100%;
        min-height: var(--space-touch-min);
        padding: var(--space-input-y) var(--space-5);
        border: 0.09375rem solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-surface);
        color: var(--color-text);
        font: inherit;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
      }

      .c-field__input:focus-visible {
        outline: none;
        border-color: var(--color-primary-mid);
        box-shadow: 0 0 0 0.1875rem var(--color-primary-tint);
      }

      .c-checkbox {
        display: flex;
        gap: 0;
        align-items: start;
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        line-height: var(--leading-normal);
      }

      .c-checkbox__input {
        width: 1.25rem;
        height: 1.25rem;
        margin: 0.2rem var(--space-2) 0 0;
        flex-shrink: 0;
        accent-color: var(--color-primary-mid);
      }

      .c-oauth-authorize__error {
        margin: 0 0 var(--space-5);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-md);
        background: var(--color-error-subtle);
        color: var(--color-error);
        font-size: var(--text-sm);
        line-height: var(--leading-normal);
      }

      .c-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: var(--space-touch-min);
        padding: 0.625rem var(--space-4);
        border: 0.0625rem solid transparent;
        border-radius: var(--radius-full);
        background: var(--color-primary-mid);
        color: var(--color-text-on-primary);
        font-family: var(--font-body);
        font-size: var(--text-base);
        font-weight: var(--font-weight-semibold);
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: background-color var(--transition-base), border-color var(--transition-base);
      }

      .c-btn:disabled {
        cursor: progress;
        opacity: 0.82;
      }

      .c-btn__spinner {
        display: none;
        width: 1rem;
        height: 1rem;
        margin-left: var(--space-2);
        border: 0.125rem solid color-mix(in srgb, var(--color-text-on-primary) 38%, transparent);
        border-top-color: var(--color-text-on-primary);
        border-radius: var(--radius-full);
        animation: c-oauth-spin 700ms linear infinite;
      }

      .c-btn:active .c-btn__spinner,
      .c-btn.is-loading .c-btn__spinner,
      .c-btn[aria-busy="true"] .c-btn__spinner {
        display: inline-flex;
      }

      @keyframes c-oauth-spin {
        to { transform: rotate(360deg); }
      }

      .c-btn:hover { background: var(--color-primary-hover); }
      .c-btn:active { background: var(--color-primary-active); }

      @media (min-width: 64rem) {
        body { padding: var(--space-10); }
        .c-oauth-authorize { width: 28rem; }
      }
    </style>
  </head>
  <body>
    <main class="c-oauth-authorize">
      <h1 class="c-oauth-authorize__title" aria-label="Autorizar asistente">
        <span class="c-oauth-authorize__title-accent">Autorizar</span> asistente
      </h1>
      <section class="c-card" aria-label="Formulario de autorización MCP">
        <p class="c-oauth-authorize__intro">Claude Desktop solicita acceso MCP a Blíster para consultar y actualizar tus datos según tus permisos.</p>
        ${errorMessage ? `<p class="c-oauth-authorize__error">${escapeHtml(errorMessage)}</p>` : ''}
        <form class="c-oauth-authorize__form" method="post" action="/oauth/authorize">
        ${hiddenInputs}
        <label class="c-field">
          <span class="c-field__label">Usuario o email</span>
          <input class="c-field__input" name="identifier" type="text" autocomplete="username" required />
        </label>
        <label class="c-field">
          <span class="c-field__label">Contraseña</span>
          <input class="c-field__input" name="password" type="password" autocomplete="current-password" required />
        </label>
        <label class="c-checkbox">
          <input class="c-checkbox__input" name="consent" type="checkbox" required />
          <span>Permitir que Claude Desktop use el endpoint MCP de Blister con mi cuenta.</span>
        </label>
        <button class="c-btn c-btn--primary" type="submit" autocomplete="off">
          <span class="c-btn__label">Autorizar conexión</span>
          <span class="c-btn__spinner" aria-hidden="true"></span>
        </button>
        </form>
      </section>
    </main>
    <script>
      const form = document.querySelector('.c-oauth-authorize__form');
      const button = form?.querySelector('.c-btn');

      const showLoading = () => {
        button?.classList.add('is-loading');
        button?.setAttribute('aria-busy', 'true');
      };

      button?.addEventListener('click', () => {
        if (form?.checkValidity()) showLoading();
      });

      form?.addEventListener('submit', () => {
        showLoading();
        window.requestAnimationFrame(() => button?.setAttribute('disabled', ''));
      });
    </script>
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
