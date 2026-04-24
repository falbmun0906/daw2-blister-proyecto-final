import { type Types } from 'mongoose';

import { type SYSTEM_SYNC_STATUS } from '../constants/domain.constants';

export type SystemSyncStatus = (typeof SYSTEM_SYNC_STATUS)[number];

export interface SystemMetaDocument {
  _id: Types.ObjectId;
  lastCimaSync: Date;
  syncStatus: SystemSyncStatus;
}
