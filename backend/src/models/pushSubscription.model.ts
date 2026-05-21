import { model, models, Schema } from 'mongoose';

import { type PushSubscriptionDocument } from '../types/push-subscription.types';

const pushSubscriptionSchema = new Schema<PushSubscriptionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  expirationTime: {
    type: Number,
    default: null,
  },
  keys: {
    p256dh: {
      type: String,
      required: true,
      trim: true,
    },
    auth: {
      type: String,
      required: true,
      trim: true,
    },
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500,
    default: null,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
});

pushSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

export const PushSubscriptionModel =
  models.PushSubscription ??
  model<PushSubscriptionDocument>('PushSubscription', pushSubscriptionSchema);
