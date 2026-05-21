import { model, models, Schema } from 'mongoose';

import { AUTH_SESSION_USER_AGENT_MAX_LENGTH } from '../constants/security.constants';
import { type AuthSessionDocument } from '../types/auth-session.types';

const authSessionSchema = new Schema<AuthSessionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    select: false,
  },
  refreshTokenJti: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    select: false,
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: AUTH_SESSION_USER_AGENT_MAX_LENGTH,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
});

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });

export const AuthSessionModel = models.AuthSession
  ?? model<AuthSessionDocument>('AuthSession', authSessionSchema);