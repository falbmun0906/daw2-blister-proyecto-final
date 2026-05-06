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
  CIMA_BASE_URL: z.string().trim().url().default('https://cima.aemps.es/cima/rest'),
  JWT_SECRET: z.string().trim().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_ACCESS_EXPIRES_IN: z.string().trim().min(1).default(DEFAULT_ACCESS_TOKEN_TTL),
  JWT_REFRESH_EXPIRES_IN: z.string().trim().min(1).default(DEFAULT_REFRESH_TOKEN_TTL),
  MCP_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(DEFAULT_MCP_TOKEN_TTL_DAYS).default(DEFAULT_MCP_TOKEN_TTL_DAYS),
  MCP_SERVER_ENABLED: z.enum(['true', 'false']).default('true'),
  WEB_PUSH_VAPID_PUBLIC_KEY: z.string().trim().optional(),
  WEB_PUSH_VAPID_PRIVATE_KEY: z.string().trim().optional(),
  WEB_PUSH_VAPID_SUBJECT: z.string().trim().default('mailto:admin@example.com'),
  PUSH_REMINDER_SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
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
  cimaBaseUrl: parsedEnv.data.CIMA_BASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
  mcpTokenTtlDays: parsedEnv.data.MCP_TOKEN_TTL_DAYS,
  mcpServerEnabled: parsedEnv.data.MCP_SERVER_ENABLED === 'true',
  webPushVapidPublicKey: parsedEnv.data.WEB_PUSH_VAPID_PUBLIC_KEY,
  webPushVapidPrivateKey: parsedEnv.data.WEB_PUSH_VAPID_PRIVATE_KEY,
  webPushVapidSubject: parsedEnv.data.WEB_PUSH_VAPID_SUBJECT,
  pushReminderScanIntervalMs: parsedEnv.data.PUSH_REMINDER_SCAN_INTERVAL_MS,
} as const;

export type Env = typeof env;
