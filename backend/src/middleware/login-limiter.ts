import rateLimit from 'express-rate-limit';

import { AUTH_LOGIN_RATE_LIMIT_MAX, FIFTEEN_MINUTES_IN_MS } from '../constants/security.constants';

// REST and OAuth share a password-guessing budget.
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_IN_MS,
  max: AUTH_LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
