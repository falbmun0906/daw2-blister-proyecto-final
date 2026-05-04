import type { UserSettings } from '../types/auth.types';
import type { NotificationView } from '../types/notification.types';

interface SchedulableAppointment {
  id: string;
  title: string;
  date: string;
  treatmentId: string | null;
}

const shownNotificationIds = new Set<string>();
const scheduledAppointmentTimers = new Map<string, number>();

const getReminderHours = (settings: UserSettings): number => {
  switch (settings.notifications.appointmentReminderPreset) {
    case '12h':
      return 12;
    case '1d':
      return 24;
    case 'custom':
      return settings.notifications.customAppointmentReminderHours;
    case '3h':
    default:
      return 3;
  }
};

const allowsNotificationType = (notification: NotificationView, settings: UserSettings): boolean => {
  switch (notification.type) {
    case 'stock_low':
    case 'stock_depleted':
      return settings.notifications.stock;
    case 'expiration_warning':
      return settings.notifications.expiration;
    case 'cima_change':
      return settings.notifications.cima;
    case 'adherence_forced':
      return settings.notifications.adherence;
    case 'system':
      return true;
  }
};

export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
};

export const showPushNotification = async (title: string, body: string): Promise<void> => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
  if (registration) {
    await registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
    return;
  }
  new Notification(title, { body, icon: '/pwa-192x192.png' });
};

export const mirrorUnreadNotificationsToPush = async (
  notifications: NotificationView[],
  settings: UserSettings | null | undefined,
): Promise<void> => {
  if (!settings?.notifications.pushEnabled) return;
  const permission = await requestPushPermission();
  if (permission !== 'granted') return;

  for (const notification of notifications) {
    if (notification.isRead || shownNotificationIds.has(notification.id)) continue;
    if (!allowsNotificationType(notification, settings)) continue;
    shownNotificationIds.add(notification.id);
    await showPushNotification(notification.title, notification.message);
  }
};

export const scheduleAppointmentNotifications = (
  appointments: SchedulableAppointment[],
  settings: UserSettings | null | undefined,
): void => {
  if (!settings?.notifications.pushEnabled || !settings.notifications.appointments) return;
  const reminderHours = getReminderHours(settings);
  const now = Date.now();

  for (const appointment of appointments) {
    const appointmentAt = new Date(appointment.date).getTime();
    const reminderAt = appointmentAt - reminderHours * 60 * 60 * 1000;
    const followUpAt = appointmentAt + 15 * 60 * 1000;
    const reminders = [
      {
        key: `${appointment.id}:before:${reminderHours}`,
        at: reminderAt,
        title: 'Cita médica próxima',
        body: `Tienes ${appointment.title} dentro de ${reminderHours} h.`,
      },
      {
        key: `${appointment.id}:after`,
        at: followUpAt,
        title: 'Tras la cita',
        body: appointment.treatmentId
          ? 'Tras la cita, ¿hay algún cambio que quieras realizar al tratamiento?'
          : 'Tras la cita, ¿hay algún cambio que quieras anotar?',
      },
    ];

    for (const reminder of reminders) {
      if (reminder.at <= now || scheduledAppointmentTimers.has(reminder.key)) continue;
      const delay = reminder.at - now;
      const timerId = window.setTimeout(() => {
        scheduledAppointmentTimers.delete(reminder.key);
        void showPushNotification(reminder.title, reminder.body);
      }, delay);
      scheduledAppointmentTimers.set(reminder.key, timerId);
    }
  }
};