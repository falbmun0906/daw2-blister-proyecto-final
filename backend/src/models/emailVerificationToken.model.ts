import { model, models, Schema } from 'mongoose';

export interface EmailVerificationTokenDocument {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
}

const emailVerificationTokenSchema = new Schema<EmailVerificationTokenDocument>({
  tokenHash: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    select: false,
  },
  userId: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
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

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailVerificationTokenSchema.index({ userId: 1, email: 1 });

export const EmailVerificationTokenModel = models.EmailVerificationToken
  ?? model<EmailVerificationTokenDocument>('EmailVerificationToken', emailVerificationTokenSchema);