import { model, models, Schema } from 'mongoose';

import {
  NOTIFICATION_SEVERITIES,
  NOTIFICATION_TYPES,
} from '../constants/domain.constants';
import { type NotificationDocument } from '../types/notification.types';

const notificationSchema = new Schema<NotificationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  blisterId: {
    type: Schema.Types.ObjectId,
    ref: 'Blister',
    default: null,
    index: true,
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    trim: true,
  },
  severity: {
    type: String,
    enum: NOTIFICATION_SEVERITIES,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: null,
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false,
  },
  dismissedAt: {
    type: Date,
    default: null,
    index: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

notificationSchema.index({ userId: 1, dismissedAt: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ blisterId: 1, type: 1, createdAt: -1 });

export const NotificationModel =
  models.Notification ?? model<NotificationDocument>('Notification', notificationSchema);
