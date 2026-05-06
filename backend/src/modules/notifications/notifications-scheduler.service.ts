import { env } from '../../config/env';
import { notifyUpcomingAppointmentReminders } from './notifications.service';

let reminderTimer: NodeJS.Timeout | null = null;

const runReminderScan = (): void => {
  void notifyUpcomingAppointmentReminders().catch(() => undefined);
};

/**
 * Starts the lightweight appointment reminder scanner used for server-side Web Push.
 */
export const notificationsSchedulerStart = (): void => {
  if (reminderTimer) {
    return;
  }

  runReminderScan();
  reminderTimer = setInterval(runReminderScan, env.pushReminderScanIntervalMs);
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
