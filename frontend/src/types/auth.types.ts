import { z } from 'zod';

import { authSessionSchema, authTokensSchema, userSchema } from '../../../shared/schemas/auth.schema';

export type User = z.infer<typeof userSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;