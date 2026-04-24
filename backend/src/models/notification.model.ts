import { model, models, Schema } from 'mongoose';

import {
  CIMA_NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
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
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: NOTIFICATION_CATEGORIES,
    required: true,
    trim: true,
  },
  cimaType: {
    type: String,
    enum: CIMA_NOTIFICATION_TYPES,
    default: null,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  isRead: {
    type: Boolean,
    required: true,
    default: false,
  },
});

notificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel =
  models.Notification ?? model<NotificationDocument>('Notification', notificationSchema);
