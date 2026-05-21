import { Types } from 'mongoose';

import {
  BLISTER_RESTORE_WINDOW_MS,
  PRIVACY_PURGE_SCAN_INTERVAL_MS,
} from '../../constants/domain.constants';
import { AdherenceLogModel } from '../../models/adherenceLog.model';
import { AppointmentModel } from '../../models/appointment.model';
import { AuthSessionModel } from '../../models/authSession.model';
import { BlisterModel } from '../../models/blister.model';
import { EmailVerificationTokenModel } from '../../models/emailVerificationToken.model';
import { MedicineModel } from '../../models/medicine.model';
import { NotificationModel } from '../../models/notification.model';
import { OAuthTokenModel } from '../../models/oauthToken.model';
import { PasswordResetTokenModel } from '../../models/passwordResetToken.model';
import { PushSubscriptionModel } from '../../models/pushSubscription.model';
import { TreatmentModel } from '../../models/treatment.model';
import { UserModel } from '../../models/user.model';

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

export const purgeExpiredDeletedUsers = async (): Promise<number> => {
  const cutoff = new Date(Date.now() - BLISTER_RESTORE_WINDOW_MS);
  const users = await UserModel.find({
    deletedAt: { $lte: cutoff },
  })
    .select('_id')
    .lean();
  const userIds = users.map((user) => user._id as Types.ObjectId);
  const userIdStrings = userIds.map((id) => id.toString());

  if (userIds.length === 0) {
    return 0;
  }

  await Promise.all([
    AuthSessionModel.deleteMany({ userId: { $in: userIds } }),
    EmailVerificationTokenModel.deleteMany({ userId: { $in: userIdStrings } }),
    NotificationModel.deleteMany({ userId: { $in: userIds } }),
    OAuthTokenModel.deleteMany({ userId: { $in: userIdStrings } }),
    PasswordResetTokenModel.deleteMany({ userId: { $in: userIdStrings } }),
    PushSubscriptionModel.deleteMany({ userId: { $in: userIds } }),
  ]);

  const result = await UserModel.deleteMany({ _id: { $in: userIds } });

  return result.deletedCount ?? 0;
};

const runPrivacyPurge = (): void => {
  void Promise.all([
    purgeExpiredDeletedBlisters(),
    purgeExpiredDeletedUsers(),
  ]).catch(() => undefined);
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
