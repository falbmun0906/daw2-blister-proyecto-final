import dotenv from 'dotenv';
import { z } from 'zod';

import {
  DEFAULT_ACCESS_TOKEN_TTL,
  DEFAULT_MCP_TOKEN_TTL_DAYS,
  DEFAULT_PORT,
  DEFAULT_REFRESH_TOKEN_TTL,
} from '../constants/security.constants';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().trim().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default(DEFAULT_ACCESS_TOKEN_TTL),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default(DEFAULT_REFRESH_TOKEN_TTL),
  MCP_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(DEFAULT_MCP_TOKEN_TTL_DAYS).default(DEFAULT_MCP_TOKEN_TTL_DAYS),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  mongodbUri: parsedEnv.data.MONGODB_URI,
  clientOrigin: parsedEnv.data.CLIENT_ORIGIN,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  mcpTokenTtlDays: parsedEnv.data.MCP_TOKEN_TTL_DAYS,
} as const;

export type Env = typeof env;
