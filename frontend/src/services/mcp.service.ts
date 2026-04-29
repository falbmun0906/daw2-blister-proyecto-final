import { apiClient, normalizeApiResponse } from './api.client';
import { z } from 'zod';

const mcpTokenResultSchema = z.object({ token: z.string().min(1) });

export type McpTokenResult = z.infer<typeof mcpTokenResultSchema>;

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
