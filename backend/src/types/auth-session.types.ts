import { type Types } from 'mongoose';

/**
 * Represents a refresh-token chain owned by one authenticated browser or PWA install.
 */
export interface AuthSessionDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  refreshTokenHash: string;
  refreshTokenJti: string;
  userAgent?: string | null;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  lastUsedAt?: Date | null;
}