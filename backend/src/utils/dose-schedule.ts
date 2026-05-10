const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_IN_MS = 24 * HOUR_IN_MS;

export interface DoseScheduleSource {
  startDate: Date;
  endDate?: Date | null;
  active: boolean;
}

export interface DoseScheduleEntry {
  firstDoseAt: Date;
  scheduleType?: 'interval' | 'daily_times';
  frequencyHours?: number | null;
  dailyDoseTimes?: string[];
  isRecurring: boolean;
}

const toDayStart = (value: Date): Date => {
  const start = new Date(value.getTime());
  start.setHours(0, 0, 0, 0);
  return start;
};

const toDoseAt = (day: Date, timeOfDay: string): Date => {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const doseAt = new Date(day.getTime());
  doseAt.setHours(hours, minutes, 0, 0);
  return doseAt;
};

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

  const cutoff = source.endDate?.getTime() ?? Number.POSITIVE_INFINITY;
  let dayCursor = toDayStart(lowerBound > source.startDate ? lowerBound : source.startDate);

  while (dayCursor.getTime() <= cutoff) {
    for (const timeOfDay of dailyTimes) {
      const doseAt = toDoseAt(dayCursor, timeOfDay);
      if (doseAt < source.startDate || doseAt < lowerBound) {
        continue;
      }
      if (doseAt.getTime() > cutoff) {
        return null;
      }
      return doseAt;
    }

    dayCursor = new Date(dayCursor.getTime() + DAY_IN_MS);
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

    let dayCursor = toDayStart(from > source.startDate ? from : source.startDate);
    while (dayCursor.getTime() <= cutoff && occurrences.length < maxOccurrences) {
      for (const timeOfDay of dailyTimes) {
        const doseAt = toDoseAt(dayCursor, timeOfDay);
        if (doseAt < source.startDate || doseAt < from || doseAt.getTime() > cutoff) {
          continue;
        }

        occurrences.push(doseAt);
        if (occurrences.length >= maxOccurrences) {
          break;
        }
      }

      dayCursor = new Date(dayCursor.getTime() + DAY_IN_MS);
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
