import { type Types } from 'mongoose';

import {
  type CIMA_NOTIFICATION_TYPES,
  type NOTIFICATION_CATEGORIES,
} from '../constants/domain.constants';

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type CimaNotificationType = (typeof CIMA_NOTIFICATION_TYPES)[number];

export interface NotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  blisterId: Types.ObjectId;
  category: NotificationCategory;
  cimaType?: CimaNotificationType | null;
  message: string;
  isRead: boolean;
}
