import { AsyncLocalStorage } from 'node:async_hooks';

import { AppError } from '../utils/app-error';
import { resolveMcpContextFromToken } from './context';

export const mcpRequestToken = new AsyncLocalStorage<string>();

// Resolve at tool invocation, rather than keeping the permissions that were
// present when the transport was initialized. AsyncLocalStorage isolates calls.
export const resolveMcpRequestContext = async () => {
  const token = mcpRequestToken.getStore();
  if (!token) {
    throw new AppError({ code: 'MCP_TOKEN_MISSING', message: 'Authentication required.', statusCode: 401 });
  }
  return resolveMcpContextFromToken(token);
};
