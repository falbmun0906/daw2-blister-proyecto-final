import { env } from '../../config/env';
import { notifyDueDoseReminders, notifyUpcomingAppointmentReminders, notifyExpirationWarningsForMedicines } from './notifications.service';
import { BlisterModel } from '../../models/blister.model';
import { MedicineModel } from '../../models/medicine.model';

let reminderTimer: NodeJS.Timeout | null = null;
let reminderScanRunning = false;
let lastExpirationScan = 0;

export const scanExpirationWarnings = async (): Promise<void> => {
  if (Date.now() - lastExpirationScan < 60 * 60 * 1000) return;
  const now = new Date();
  const cutoff = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  const cursor = BlisterModel.find({ deletedAt: null }).cursor();
  for await (const blister of cursor) {
    const medicines = await MedicineModel.find({ blisterId: blister._id, deletedAt: null, expDate: { $gte: new Date(now.toISOString().slice(0, 10)), $lte: cutoff } });
    await notifyExpirationWarningsForMedicines(medicines, blister, now);
  }
  lastExpirationScan = now.getTime();
};

const runReminderScan = async (): Promise<void> => {
  if (reminderScanRunning) {
    return;
  }

  reminderScanRunning = true;

  try {
    const results = await Promise.allSettled([
      notifyUpcomingAppointmentReminders(),
      notifyDueDoseReminders(),
      scanExpirationWarnings(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Notification reminder scan failed. It will be retried.');
      }
    }
  } finally {
    reminderScanRunning = false;
  }
};

/**
 * Starts the lightweight appointment reminder scanner used for server-side Web Push.
 */
export const notificationsSchedulerStart = (): void => {
  if (reminderTimer) {
    return;
  }

  void runReminderScan();
  reminderTimer = setInterval(() => {
    void runReminderScan();
  }, env.pushReminderScanIntervalMs);
};

/**
 * Stops the appointment reminder scanner during graceful shutdown.
 */
export const notificationsSchedulerStop = (): void => {
  if (!reminderTimer) {
    return;
  }

  clearInterval(reminderTimer);
  reminderTimer = null;
};
