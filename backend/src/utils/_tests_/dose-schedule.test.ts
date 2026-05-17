import {
  computeDosesInRange,
  computeNextDose,
} from '../dose-schedule';

describe('dose-schedule', () => {
  it('computes the next exact daily dose inside the requested range', () => {
    const nextDose = computeNextDose({
      startDate: new Date('2030-04-24T22:00:00.000Z'),
      endDate: null,
      active: true,
      timeZone: 'Europe/Madrid',
    }, {
      firstDoseAt: new Date('2030-04-24T22:00:00.000Z'),
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['08:00', '20:00'],
      isRecurring: true,
    }, new Date('2030-04-25T10:00:00.000Z'));

    expect(nextDose).not.toBeNull();
    expect(nextDose?.toISOString()).toBe('2030-04-25T18:00:00.000Z');
  });

  it('generates recurring exact daily doses across multiple days', () => {
    const doses = computeDosesInRange({
      startDate: new Date('2030-04-24T22:00:00.000Z'),
      endDate: null,
      active: true,
      timeZone: 'Europe/Madrid',
    }, {
      firstDoseAt: new Date('2030-04-24T22:00:00.000Z'),
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['08:00', '20:00'],
      isRecurring: true,
    }, new Date('2030-04-24T22:00:00.000Z'), new Date('2030-04-26T20:59:00.000Z'));

    expect(doses).toHaveLength(4);
    expect(doses.map((dose) => dose.toISOString())).toEqual([
      '2030-04-25T06:00:00.000Z',
      '2030-04-25T18:00:00.000Z',
      '2030-04-26T06:00:00.000Z',
      '2030-04-26T18:00:00.000Z',
    ]);
  });

  it('keeps civil daily times stable across Europe/Madrid DST changes', () => {
    const doses = computeDosesInRange({
      startDate: new Date('2026-03-27T23:00:00.000Z'),
      endDate: null,
      active: true,
      timeZone: 'Europe/Madrid',
    }, {
      firstDoseAt: new Date('2026-03-27T23:00:00.000Z'),
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['10:00'],
      isRecurring: true,
    }, new Date('2026-03-27T23:00:00.000Z'), new Date('2026-03-29T21:59:00.000Z'));

    expect(doses.map((dose) => dose.toISOString())).toEqual([
      '2026-03-28T09:00:00.000Z',
      '2026-03-29T08:00:00.000Z',
    ]);
  });
});