import dotenv from 'dotenv';
import { z } from 'zod';

import {
  DEFAULT_ACCESS_TOKEN_TTL,
  DEFAULT_MCP_TOKEN_TTL_DAYS,
  DEFAULT_PORT,
  DEFAULT_REFRESH_TOKEN_TTL,
} from '../constants/security.constants';

dotenv.config();

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const parseOriginList = (value: string | undefined, envName: string): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => {
      try {
        return normalizeOrigin(new URL(origin).toString());
      } catch {
        throw new Error(`Invalid environment configuration: ${envName} contains an invalid URL: ${origin}`);
      }
    });
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  BACKEND_URL: z.string().trim().url().default('https://blister-backend.onrender.com'),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),
  CLIENT_ORIGIN: z.string().trim().url().default('http://localhost:5173'),
  CLIENT_ORIGINS: z.string().optional(),
  EMAIL_ASSET_ORIGIN: z.string().trim().url().default('https://blister-app.onrender.com'),
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
  RESEND_API_KEY: z.string().trim().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

const clientOrigins = Array.from(
  new Set([
    normalizeOrigin(parsedEnv.data.CLIENT_ORIGIN),
    ...parseOriginList(parsedEnv.data.CLIENT_ORIGINS, 'CLIENT_ORIGINS'),
  ]),
);

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  backendUrl: parsedEnv.data.BACKEND_URL.replace(/\/+$/, ''),
  mongodbUri: parsedEnv.data.MONGODB_URI,
  clientOrigin: clientOrigins[0],
  clientOrigins,
  emailAssetOrigin: parsedEnv.data.EMAIL_ASSET_ORIGIN.replace(/\/+$/, ''),
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
  resendApiKey: parsedEnv.data.RESEND_API_KEY,
} as const;

export type Env = typeof env;
