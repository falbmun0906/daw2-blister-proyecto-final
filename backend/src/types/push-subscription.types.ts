import { type Types } from 'mongoose';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date | null;
}
