import type { NotificationView } from '../types/notification.types';

/** Oculta en Home los recordatorios previos de cita una vez la cita ya ha pasado. */
export function isExpiredAppointmentReminderAlert(
  notification: NotificationView,
  referenceTime = Date.now(),
): boolean {
  if (notification.type !== 'appointment_reminder') return false;

  const reminderPhase = notification.metadata?.reminderPhase;
  const appointmentDate = notification.metadata?.appointmentDate;
  if (reminderPhase !== 'before' || typeof appointmentDate !== 'string') return false;

  const appointmentTime = Date.parse(appointmentDate);
  return Number.isFinite(appointmentTime) && appointmentTime <= referenceTime;
}