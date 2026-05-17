import {
  addCivilDays,
  getCivilDateKey,
  getMedicationTimeZone,
  maxCivilDateKey,
  zonedTimeToDate,
} from './time-zone';

const HOUR_IN_MS = 60 * 60 * 1000;
const MAX_DAILY_TIME_LOOKAHEAD_DAYS = 366 * 10;

export interface DoseScheduleSource {
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
  timeZone?: string | null;
}

export interface DoseScheduleEntry {
  firstDoseAt: Date;
  scheduleType?: 'interval' | 'daily_times';
  frequencyHours?: number | null;
  dailyDoseTimes?: string[];
  isRecurring: boolean;
}

const getSortedDailyTimes = (entry: DoseScheduleEntry): string[] =>
  [...(entry.dailyDoseTimes ?? [])].sort((left, right) => left.localeCompare(right));

/**
 * Calcula la próxima dosis posterior o igual a `lowerBound` para una pauta
 * recurrente por intervalo o por horas exactas al día.
 */
const computeNextIntervalDose = (
  startDate: Date,
  frequencyHours: number,
  lowerBound: Date,
): Date => {
  const frequencyMs = frequencyHours * HOUR_IN_MS;
  const startMs = startDate.getTime();
  const lowerMs = lowerBound.getTime();

  if (startMs >= lowerMs) {
    return new Date(startMs);
  }

  const steps = Math.ceil((lowerMs - startMs) / frequencyMs);
  return new Date(startMs + steps * frequencyMs);
};

const computeNextDailyTimeDose = (
  source: DoseScheduleSource,
  entry: DoseScheduleEntry,
  lowerBound: Date,
): Date | null => {
  const dailyTimes = getSortedDailyTimes(entry);
  if (dailyTimes.length === 0) {
    return null;
  }

  const timeZone = getMedicationTimeZone(source.timeZone);
  const cutoff = source.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  const firstDay = maxCivilDateKey(
    getCivilDateKey(lowerBound > source.startDate ? lowerBound : source.startDate, timeZone),
    getCivilDateKey(source.startDate, timeZone),
  );
  const lastDay = source.endDate
    ? getCivilDateKey(source.endDate, timeZone)
    : addCivilDays(firstDay, MAX_DAILY_TIME_LOOKAHEAD_DAYS);
  let dayCursor = firstDay;

  while (dayCursor <= lastDay) {
    for (const timeOfDay of dailyTimes) {
      const doseAt = zonedTimeToDate(dayCursor, timeOfDay, timeZone);
      if (doseAt < source.startDate || doseAt < lowerBound) {
        continue;
      }
      if (doseAt.getTime() > cutoff) {
        return null;
      }
      return doseAt;
    }

    dayCursor = addCivilDays(dayCursor, 1);
  }

  return null;
};

export const computeNextDose = (
  source: DoseScheduleSource,
  entry: DoseScheduleEntry,
  lowerBound: Date,
): Date | null => {
  if (!source.active) {
    return null;
  }

  if (!entry.isRecurring) {
    const doseAt = source.startDate;
    if (doseAt < lowerBound) {
      return null;
    }
    if (source.endDate && doseAt > source.endDate) {
      return null;
    }
    return new Date(doseAt.getTime());
  }

  if (entry.scheduleType === 'daily_times') {
    return computeNextDailyTimeDose(source, entry, lowerBound);
  }

  if (!entry.frequencyHours || entry.frequencyHours <= 0) {
    return null;
  }

  const nextDose = computeNextIntervalDose(source.startDate, entry.frequencyHours, lowerBound);
  if (source.endDate && nextDose > source.endDate) {
    return null;
  }

  return nextDose;
};

/**
 * Genera todas las dosis previstas de una pauta dentro del rango [from, to].
 */
export const computeDosesInRange = (
  source: DoseScheduleSource,
  entry: DoseScheduleEntry,
  from: Date,
  to: Date,
  maxOccurrences = 200,
): Date[] => {
  if (!source.active || from > to) {
    return [];
  }

  const cutoff = source.endDate ? Math.min(source.endDate.getTime(), to.getTime()) : to.getTime();
  if (cutoff < from.getTime()) {
    return [];
  }

  if (!entry.isRecurring) {
    return source.startDate >= from && source.startDate.getTime() <= cutoff
      ? [new Date(source.startDate.getTime())]
      : [];
  }

  if (entry.scheduleType === 'daily_times') {
    const occurrences: Date[] = [];
    const dailyTimes = getSortedDailyTimes(entry);

    if (dailyTimes.length === 0) {
      return occurrences;
    }

    const timeZone = getMedicationTimeZone(source.timeZone);
    const firstDay = maxCivilDateKey(
      getCivilDateKey(from > source.startDate ? from : source.startDate, timeZone),
      getCivilDateKey(source.startDate, timeZone),
    );
    const lastDay = getCivilDateKey(new Date(cutoff), timeZone);
    let dayCursor = firstDay;

    while (dayCursor <= lastDay && occurrences.length < maxOccurrences) {
      for (const timeOfDay of dailyTimes) {
        const doseAt = zonedTimeToDate(dayCursor, timeOfDay, timeZone);
        if (doseAt < source.startDate || doseAt < from || doseAt.getTime() > cutoff) {
          continue;
        }

        occurrences.push(doseAt);
        if (occurrences.length >= maxOccurrences) {
          break;
        }
      }

      dayCursor = addCivilDays(dayCursor, 1);
    }

    return occurrences;
  }

  if (!entry.frequencyHours || entry.frequencyHours <= 0) {
    return [];
  }

  const frequencyMs = entry.frequencyHours * HOUR_IN_MS;
  const occurrences: Date[] = [];
  let cursor = computeNextIntervalDose(source.startDate, entry.frequencyHours, from);

  while (cursor.getTime() <= cutoff && occurrences.length < maxOccurrences) {
    occurrences.push(new Date(cursor.getTime()));
    cursor = new Date(cursor.getTime() + frequencyMs);
  }

  return occurrences;
};
