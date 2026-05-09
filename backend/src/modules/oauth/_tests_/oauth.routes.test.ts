import { createHash } from 'node:crypto';

import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { resolveMcpContextFromToken } from '../../../mcp/context';
import { type JwtMcpOAuthPayload } from '../../../types/auth.types';
import { OAUTH_CLIENT_ID, OAUTH_DEFAULT_CLIENT_ID } from '../oauth.constants';
import { clearOAuthAuthorizationCodes } from '../oauth.service';
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from '../../auth/_tests_/auth-test.utils';

const codeVerifier = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
const redirectUri = 'http://localhost:6274/callback';

const createAuthorizePayload = () => ({
  response_type: 'code',
  client_id: OAUTH_CLIENT_ID,
  redirect_uri: redirectUri,
  state: 'state-123',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  scope: 'mcp',
});

const createDynamicAuthorizePayload = () => ({
  response_type: 'code',
  client_id: OAUTH_DEFAULT_CLIENT_ID,
  redirect_uri: redirectUri,
  state: 'state-456',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  scope: 'mcp',
});

const registerUser = async (app: ReturnType<typeof createApp>) => {
  await request(app).post('/api/v1/auth/register').send({
    name: 'Ana Lopez',
    username: 'analopez',
    email: 'ana@example.com',
    password: 'Password1!',
    confirmPassword: 'Password1!',
    privacyConsent: true,
    ageConfirmed: true,
  });
};

describe('oauth.routes', () => {
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    nodeEnv: 'test',
  });

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    clearOAuthAuthorizationCodes();
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it('exposes OAuth authorization server metadata', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-authorization-server')
      .set('Host', 'blister.test');

    expect(response.status).toBe(200);
    expect(response.body.issuer).toBe('http://blister.test');
    expect(response.body.authorization_endpoint).toBe('http://blister.test/oauth/authorize');
    expect(response.body.token_endpoint).toBe('http://blister.test/oauth/token');
    expect(response.body.registration_endpoint).toBe('http://blister.test/oauth/register');
    expect(response.body.response_types_supported).toContain('code');
    expect(response.body.grant_types_supported).toContain('authorization_code');
    expect(response.body.code_challenge_methods_supported).toContain('S256');
    expect(response.body.token_endpoint_auth_methods_supported).toContain('none');
  });

  it('exposes minimal OpenID configuration metadata', async () => {
    const response = await request(app)
      .get('/.well-known/openid-configuration')
      .set('Host', 'blister.test');

    expect(response.status).toBe(200);
    expect(response.body.issuer).toBe('http://blister.test');
    expect(response.body.authorization_endpoint).toBe('http://blister.test/oauth/authorize');
    expect(response.body.token_endpoint).toBe('http://blister.test/oauth/token');
    expect(response.body.registration_endpoint).toBe('http://blister.test/oauth/register');
    expect(response.body.response_types_supported).toContain('code');
    expect(response.body.grant_types_supported).toContain('authorization_code');
    expect(response.body.code_challenge_methods_supported).toContain('S256');
    expect(response.body.scopes_supported).toContain('mcp');
  });

  it('exposes OAuth protected resource metadata for the MCP endpoint', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-protected-resource')
      .set('Host', 'blister.test');

    expect(response.status).toBe(200);
    expect(response.body.resource).toBe('http://blister.test/mcp');
    expect(response.body.authorization_servers).toContain('http://blister.test');
    expect(response.body.bearer_methods_supported).toContain('header');
    expect(response.body.scopes_supported).toContain('mcp');
  });

  it('allows Claude Desktop localhost origins on OAuth discovery responses', async () => {
    const response = await request(app)
      .get('/.well-known/oauth-authorization-server')
      .set('Origin', 'http://localhost:49152');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:49152');
  });

  it('handles OAuth preflight requests from Claude Desktop localhost origins', async () => {
    const response = await request(app)
      .options('/oauth/token')
      .set('Origin', 'http://127.0.0.1:49153')
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://127.0.0.1:49153');
  });

  it('registers the Claude Desktop public OAuth client with dynamic localhost redirects', async () => {
    const dynamicRedirectUri = 'http://localhost:54321/callback';
    const response = await request(app)
      .post('/oauth/register')
      .send({
        client_name: 'Claude Desktop',
        redirect_uris: [dynamicRedirectUri],
        grant_types: ['authorization_code'],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
        scope: 'mcp',
      });

    expect(response.status).toBe(201);
    expect(response.body.client_id).toBe(OAUTH_DEFAULT_CLIENT_ID);
    expect(response.body.redirect_uris).toContain(dynamicRedirectUri);
    expect(response.body.token_endpoint_auth_method).toBe('none');
  });

  it('accepts singular redirect_uri in dynamic client registration requests', async () => {
    const dynamicRedirectUri = 'http://127.0.0.1:54322/callback';
    const response = await request(app)
      .post('/oauth/register')
      .send({
        client_name: 'Claude Desktop',
        redirect_uri: dynamicRedirectUri,
        scope: 'mcp',
      });

    expect(response.status).toBe(201);
    expect(response.body.client_id).toBe(OAUTH_DEFAULT_CLIENT_ID);
    expect(response.body.redirect_uris).toEqual([dynamicRedirectUri]);
  });

  it('advertises OAuth protected resource metadata when MCP auth is missing', async () => {
    const response = await request(app)
      .post('/mcp')
      .set('Host', 'blister.test')
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toContain('Bearer realm="Blister MCP"');
    expect(response.headers['www-authenticate']).toContain(
      'resource_metadata="http://blister.test/.well-known/oauth-protected-resource"',
    );
  });

  it('renders the authorization login and consent page for Claude Desktop', async () => {
    const response = await request(app)
      .get('/oauth/authorize')
      .query(createAuthorizePayload());

    expect(response.status).toBe(200);
    expect(response.text).toContain('Autorizar asistente');
    expect(response.text).toContain('claude-desktop');
    expect(response.text).toContain('code_challenge');
  });

  it('exchanges an authorization code with PKCE for an MCP OAuth access token', async () => {
    await registerUser(app);

    const authorizeResponse = await request(app)
      .post('/oauth/authorize')
      .type('form')
      .send({
        ...createAuthorizePayload(),
        identifier: 'ana@example.com',
        password: 'Password1!',
        consent: 'on',
      });

    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.location as string;
    const callbackUrl = new URL(location);
    const code = callbackUrl.searchParams.get('code');

    expect(callbackUrl.origin + callbackUrl.pathname).toBe(redirectUri);
    expect(callbackUrl.searchParams.get('state')).toBe('state-123');
    expect(code).toBeTruthy();

    const tokenResponse = await request(app)
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.token_type).toBe('Bearer');
    expect(tokenResponse.body.scope).toBe('mcp');
    expect(tokenResponse.body.expires_in).toBeGreaterThan(0);

    const payload = jwt.verify(tokenResponse.body.access_token, env.jwtSecret) as JwtMcpOAuthPayload;

    expect(payload.type).toBe('mcp_oauth');
    expect(payload.aud).toBe('mcp');
    expect(payload.client_id).toBe(OAUTH_CLIENT_ID);
    expect(payload.scope).toBe('mcp');

    const mcpContext = await resolveMcpContextFromToken(tokenResponse.body.access_token);

    expect(mcpContext.userId).toBe(payload.sub);
    expect(mcpContext.blisters).toHaveLength(1);
  });

  it('accepts the generic dynamically registered client_id in authorize and token exchange', async () => {
    await registerUser(app);

    await request(app)
      .post('/oauth/register')
      .send({
        client_name: 'ChatGPT',
        redirect_uris: [redirectUri],
        scope: 'mcp',
      })
      .expect(201);

    const authorizeResponse = await request(app)
      .post('/oauth/authorize')
      .type('form')
      .send({
        ...createDynamicAuthorizePayload(),
        identifier: 'ana@example.com',
        password: 'Password1!',
        consent: 'on',
      });

    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.location as string;
    const callbackUrl = new URL(location);
    const code = callbackUrl.searchParams.get('code');

    expect(callbackUrl.origin + callbackUrl.pathname).toBe(redirectUri);
    expect(callbackUrl.searchParams.get('state')).toBe('state-456');
    expect(code).toBeTruthy();

    const tokenResponse = await request(app)
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: OAUTH_DEFAULT_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      });

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.token_type).toBe('Bearer');

    const payload = jwt.verify(tokenResponse.body.access_token, env.jwtSecret) as JwtMcpOAuthPayload;

    expect(payload.client_id).toBe(OAUTH_DEFAULT_CLIENT_ID);
    expect(payload.scope).toBe('mcp');
  });

  it('rejects reused authorization codes', async () => {
    await registerUser(app);

    const authorizeResponse = await request(app)
      .post('/oauth/authorize')
      .type('form')
      .send({
        ...createAuthorizePayload(),
        identifier: 'ana@example.com',
        password: 'Password1!',
        consent: 'on',
      });
    const code = new URL(authorizeResponse.headers.location as string).searchParams.get('code');
    const tokenPayload = {
      grant_type: 'authorization_code',
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    };

    await request(app).post('/oauth/token').type('form').send(tokenPayload).expect(200);

    const reusedResponse = await request(app).post('/oauth/token').type('form').send(tokenPayload);

    expect(reusedResponse.status).toBe(401);
    expect(reusedResponse.body.error.code).toBe('OAUTH_CODE_INVALID');
  });
});
