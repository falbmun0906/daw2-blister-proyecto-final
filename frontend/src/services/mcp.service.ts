import { apiClient, normalizeApiResponse } from './api.client';
import { z } from 'zod';

const nullableDateSchema = z.string().nullable();

const mcpTokenStatusSchema = z.object({
  hasToken: z.boolean(),
  createdAt: nullableDateSchema,
  expiresAt: nullableDateSchema,
  lastUsedAt: nullableDateSchema,
});

const mcpTokenResultSchema = mcpTokenStatusSchema.extend({
  token: z.string().min(1),
  hasToken: z.literal(true),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
});

export type McpTokenStatus = z.infer<typeof mcpTokenStatusSchema>;
export type McpTokenResult = z.infer<typeof mcpTokenResultSchema>;

/** Obtiene el estado del token MCP activo sin exponer el valor en claro. */
export async function getMcpTokenStatus(): Promise<McpTokenStatus> {
  const response = await apiClient.get('/auth/mcp-token');
  return mcpTokenStatusSchema.parse(normalizeApiResponse(response));
}

/** Genera un nuevo token MCP. El plain-text solo se devuelve en esta llamada. */
export async function createMcpToken(expiresInDays?: number): Promise<McpTokenResult> {
  const body = expiresInDays !== undefined ? { expiresInDays } : {};
  const response = await apiClient.post('/auth/mcp-token', body);
  return mcpTokenResultSchema.parse(normalizeApiResponse(response));
}

/** Revoca el token MCP almacenado del usuario autenticado. */
export async function revokeMcpToken(): Promise<void> {
  await apiClient.delete('/auth/mcp-token');
}
