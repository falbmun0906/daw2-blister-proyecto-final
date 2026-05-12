import { z } from 'zod';

const oauthRequestValueSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.unknown()),
  z.null(),
  z.undefined(),
]);

const oauthRequestObjectSchema = z.record(z.string(), oauthRequestValueSchema);

/**
 * Accepts OAuth authorization query parameters before semantic validation.
 */
export const oauthAuthorizeQuerySchema = oauthRequestObjectSchema;

/**
 * Accepts OAuth authorization form values before login and consent validation.
 */
export const oauthAuthorizeSubmitSchema = oauthRequestObjectSchema;

/**
 * Accepts OAuth token requests for authorization-code and refresh-token grants.
 */
export const oauthTokenRequestSchema = oauthRequestObjectSchema;

/**
 * Accepts dynamic client registration payloads from MCP clients.
 */
export const oauthRegisterRequestSchema = oauthRequestObjectSchema;
