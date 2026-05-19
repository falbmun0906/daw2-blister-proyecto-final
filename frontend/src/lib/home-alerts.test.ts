import { describe, expect, it } from 'vitest';

import { isExpiredAppointmentReminderAlert } from './home-alerts';
import type { NotificationView } from '../types/notification.types';

function createNotification(overrides: Partial<NotificationView> = {}): NotificationView {
  return {
    id: 'notification-1',
    userId: 'user-1',
    blisterId: 'blister-1',
    type: 'appointment_reminder',
    severity: 'info',
    title: 'Cita médica próxima',
    message: 'Tienes Revisión anual en menos de 3 horas.',
    metadata: {
      reminderPhase: 'before',
      appointmentDate: '2030-01-01T10:00:00.000Z',
    },
    isRead: false,
    createdAt: '2030-01-01T07:00:00.000Z',
    ...overrides,
  };
}

describe('isExpiredAppointmentReminderAlert', () => {
  it('returns true when a before reminder already passed its appointment time', () => {
    const notification = createNotification();

    expect(isExpiredAppointmentReminderAlert(notification, Date.parse('2030-01-01T10:00:00.000Z'))).toBe(true);
  });

  it('keeps follow-up reminders visible after the appointment', () => {
    const notification = createNotification({
      message: "Tras la cita 'Revisión anual', revisa si hay algún cambio que anotar.",
      metadata: {
        reminderPhase: 'after',
        appointmentDate: '2030-01-01T10:00:00.000Z',
      },
    });

    expect(isExpiredAppointmentReminderAlert(notification, Date.parse('2030-01-01T11:00:00.000Z'))).toBe(false);
  });
});