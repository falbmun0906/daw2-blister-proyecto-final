import { model, models, Schema } from 'mongoose';

export interface OAuthClientDocument {
  clientId: string;
  name: string;
  redirectUris: string[];
  createdAt: Date;
}

const schema = new Schema<OAuthClientDocument>({
  clientId: { type: String, required: true, unique: true },
  name: { type: String, required: true, maxlength: 100 },
  redirectUris: { type: [String], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const OAuthClientModel = models.OAuthClient ?? model<OAuthClientDocument>('OAuthClient', schema);
