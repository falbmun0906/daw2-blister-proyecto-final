import { Types } from 'mongoose';

import {
  BLISTER_RESTORE_WINDOW_MS,
  PRIVACY_PURGE_SCAN_INTERVAL_MS,
} from '../../constants/domain.constants';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { AppointmentModel } from '../../models/appointment.model';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';
import { NotificationModel } from '../../models/notification.model';
import { TreatmentModel } from '../../models/treatment.model';

let privacyPurgeTimer: NodeJS.Timeout | null = null;

/**
 * Permanently removes soft-deleted blisters whose restore window has expired.
 */
export const purgeExpiredDeletedBlisters = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - BLISTER_RESTORE_WINDOW_MS);
  const blisters = await BlisterModel.find({
    deletedAt: { $lte: cutoff },
  })
    .select('_id')
    .lean();
  const blisterIds = blisters.map((blister) => blister._id as Types.ObjectId);

  if (blisterIds.length === 0) {
    return 0;
  }

  await Promise.all([
    AdherenceLogModel.deleteMany({ blisterId: { $in: blisterIds } }),
    AppointmentModel.deleteMany({ blisterId: { $in: blisterIds } }),
    MedicineModel.deleteMany({ blisterId: { $in: blisterIds } }),
    NotificationModel.deleteMany({ blisterId: { $in: blisterIds } }),
    TreatmentModel.deleteMany({ blisterId: { $in: blisterIds } }),
  ]);
  const result = await BlisterModel.deleteMany({ _id: { $in: blisterIds } });

  return result.deletedCount ?? 0;
};

const runPrivacyPurge = (): void => {
  void purgeExpiredDeletedBlisters().catch(() => undefined);
};

/**
 * Starts the daily privacy purge scheduler for expired soft-deleted data.
 */
export const privacyPurgeSchedulerStart = (): void => {
  if (privacyPurgeTimer) {
    return;
  }

  runPrivacyPurge();
  privacyPurgeTimer = setInterval(runPrivacyPurge, PRIVACY_PURGE_SCAN_INTERVAL_MS);
};

/**
 * Stops the privacy purge scheduler during graceful shutdown.
 */
export const privacyPurgeSchedulerStop = (): void => {
  if (!privacyPurgeTimer) {
    return;
  }

  clearInterval(privacyPurgeTimer);
  privacyPurgeTimer = null;
};
