import { model, models, Schema } from 'mongoose';

export interface PasswordResetTokenDocument {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetTokenDocument>({
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

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
passwordResetTokenSchema.index({ userId: 1 });

export const PasswordResetTokenModel = models.PasswordResetToken
  ?? model<PasswordResetTokenDocument>('PasswordResetToken', passwordResetTokenSchema);
