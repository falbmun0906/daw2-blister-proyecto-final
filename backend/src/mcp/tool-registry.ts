import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';

import {
  adherenceLoggerInputSchema,
  appointmentManagerInputSchema,
  inventoryQueryInputSchema,
  officialSourceLinkerInputSchema,
  scheduleAssistantInputSchema,
  stockModifierInputSchema,
} from '../../../shared/schemas';
import { AppError } from '../utils/app-error';
import {
  adherenceLoggerTool,
  appointmentManagerTool,
  inventoryQueryTool,
  officialSourceLinkerTool,
  scheduleAssistantTool,
  stockModifierTool,
} from './tools';
import { type McpAuthContext } from './types';

const toToolErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof Error) {
    return `MCP_TOOL_ERROR: ${error.message}`;
  }

  return 'MCP_TOOL_ERROR: Unknown MCP tool execution error.';
};

const registerTool = <TInput extends object, TResult>(
  server: McpServer,
  context: McpAuthContext,
  tool: {
    name: string;
    description: string;
    run: (ctx: McpAuthContext, input: TInput) => Promise<TResult>;
  },
  schema: z.ZodType<TInput>,
): void => {
  server.registerTool(tool.name, {
    description: tool.description,
    inputSchema: schema,
  }, async (input) => {
    try {
      const result = await tool.run(context, input as TInput);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error: unknown) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: toToolErrorMessage(error),
          },
        ],
      };
    }
  });
};

export const createMcpServerForContext = (context: McpAuthContext): McpServer => {
  const server = new McpServer({
    name: 'blister-mcp-server',
    version: '1.0.0',
  });

  registerTool(server, context, inventoryQueryTool, inventoryQueryInputSchema);
  registerTool(server, context, adherenceLoggerTool, adherenceLoggerInputSchema);
  registerTool(server, context, stockModifierTool, stockModifierInputSchema);
  registerTool(server, context, scheduleAssistantTool, scheduleAssistantInputSchema);
  registerTool(server, context, appointmentManagerTool, appointmentManagerInputSchema);
  registerTool(server, context, officialSourceLinkerTool, officialSourceLinkerInputSchema);

  return server;
};
