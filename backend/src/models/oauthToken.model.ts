import { model, models, Schema } from 'mongoose';

export interface OAuthTokenDocument {
  refreshToken: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: Date;
  createdAt: Date;
}

const oauthTokenSchema = new Schema<OAuthTokenDocument>({
  refreshToken: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    select: false,
  },
  clientId: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: String,
    required: true,
    trim: true,
  },
  scope: {
    type: String,
    required: true,
    trim: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

oauthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
oauthTokenSchema.index({ userId: 1, clientId: 1 });

export const OAuthTokenModel = models.OAuthToken ?? model<OAuthTokenDocument>('OAuthToken', oauthTokenSchema);