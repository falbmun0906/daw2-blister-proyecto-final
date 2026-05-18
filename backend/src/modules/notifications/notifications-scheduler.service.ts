import { env } from '../../config/env';
import { notifyDueDoseReminders, notifyUpcomingAppointmentReminders } from './notifications.service';

let reminderTimer: NodeJS.Timeout | null = null;
let reminderScanRunning = false;

const runReminderScan = async (): Promise<void> => {
  if (reminderScanRunning) {
    return;
  }

  reminderScanRunning = true;

  try {
    const results = await Promise.allSettled([
      notifyUpcomingAppointmentReminders(),
      notifyDueDoseReminders(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Notification reminder scan failed.', result.reason);
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
