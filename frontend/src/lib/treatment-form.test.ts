import { describe, expect, it } from 'vitest';
import { buildUpdatePayload, toFormValues } from './treatment-form';
import type { Treatment } from '../../../shared/schemas/treatment.schema';

const treatment: Treatment = {
  id: '507f1f77bcf86cd799439011', blisterId: '507f1f77bcf86cd799439012', patientUserId: '507f1f77bcf86cd799439013',
  title: 'Synthetic', description: null, timeZone: 'Europe/Madrid', active: true,
  startDate: '2030-10-31T23:00:00.000Z', endDate: '2030-11-30T22:59:30.000Z',
  medicines: [{ medicineId: '507f1f77bcf86cd799439014', amount: 1, firstDoseAt: '2030-11-02T08:15:30.000Z',
    scheduleType: 'interval', frequencyHours: 8, dailyDoseTimes: [], isRecurring: true, note: null }],
};

describe('editing a treatment in its own time zone', () => {
  it('preserves the exact first-dose date and seconds when changing only its title', () => {
    const values = toFormValues(treatment);
    expect(values.startDate).toBe('2030-11-01');
    expect(values.medicines[0].firstDoseTime).toBe('09:15');
    values.title = 'Renamed';
    const update = buildUpdatePayload(values, treatment);
    expect(update.medicines?.[0].firstDoseAt.toISOString()).toBe(treatment.medicines[0].firstDoseAt);
    expect(update.startDate?.toISOString()).toBe(treatment.startDate);
    expect(update.endDate?.toISOString()).toBe(treatment.endDate);
  });
  it('changes the time in the treatment zone while preserving the first-dose day', () => {
    const values = toFormValues(treatment);
    values.medicines[0].firstDoseTime = '10:15';
    const update = buildUpdatePayload(values, treatment);
    expect(update.medicines?.[0].firstDoseAt.toISOString()).toBe('2030-11-02T09:15:00.000Z');
  });
});
