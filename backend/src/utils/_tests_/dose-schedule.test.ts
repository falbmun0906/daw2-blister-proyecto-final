import {
  computeDosesInRange,
  computeNextDose,
} from '../dose-schedule';

const localDate = (year: number, monthIndex: number, day: number, hours: number, minutes = 0): Date =>
  new Date(year, monthIndex, day, hours, minutes, 0, 0);

describe('dose-schedule', () => {
  it('computes the next exact daily dose inside the requested range', () => {
    const nextDose = computeNextDose({
      startDate: localDate(2030, 3, 25, 8),
      endDate: null,
      active: true,
    }, {
      firstDoseAt: localDate(2030, 3, 25, 8),
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['08:00', '20:00'],
      isRecurring: true,
    }, localDate(2030, 3, 25, 12));

    expect(nextDose).not.toBeNull();
    expect(nextDose?.getHours()).toBe(20);
    expect(nextDose?.getMinutes()).toBe(0);
  });

  it('generates recurring exact daily doses across multiple days', () => {
    const doses = computeDosesInRange({
      startDate: localDate(2030, 3, 25, 8),
      endDate: null,
      active: true,
    }, {
      firstDoseAt: localDate(2030, 3, 25, 8),
      scheduleType: 'daily_times',
      frequencyHours: null,
      dailyDoseTimes: ['08:00', '20:00'],
      isRecurring: true,
    }, localDate(2030, 3, 25, 0), localDate(2030, 3, 26, 23));

    expect(doses).toHaveLength(4);
    expect(doses.map((dose) => `${dose.getDate()}-${dose.getHours()}:${dose.getMinutes()}`)).toEqual([
      '25-8:0',
      '25-20:0',
      '26-8:0',
      '26-20:0',
    ]);
  });
});