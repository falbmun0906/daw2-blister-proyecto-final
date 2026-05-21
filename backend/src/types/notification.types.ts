import { type Types } from 'mongoose';

import {
  type EXPIRATION_WARNING_LEVELS,
  type NOTIFICATION_SEVERITIES,
  type NOTIFICATION_TYPES,
} from '../constants/domain.constants';

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
export type ExpirationWarningLevel = (typeof EXPIRATION_WARNING_LEVELS)[number];
export type NotificationMetadata = Record<string, unknown>;

export interface NotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  blisterId?: Types.ObjectId | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  metadata?: NotificationMetadata | null;
  isRead: boolean;
  dismissedAt?: Date | null;
  createdAt: Date;
}
