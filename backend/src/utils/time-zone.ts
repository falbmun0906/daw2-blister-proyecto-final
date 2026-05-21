import { DEFAULT_MEDICATION_TIME_ZONE } from '../../../shared/schemas/schema.constants';

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
};

const getZonedDateParts = (date: Date, timeZone: string): ZonedDateParts => {
  const parts = getFormatter(timeZone).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  };
};

const pad = (value: number): string => value.toString().padStart(2, '0');

export const getMedicationTimeZone = (timeZone?: string | null): string => {
  const candidate = timeZone?.trim() || DEFAULT_MEDICATION_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_MEDICATION_TIME_ZONE;
  }
};

export const getCivilDateKey = (date: Date, timeZone?: string | null): string => {
  const parts = getZonedDateParts(date, getMedicationTimeZone(timeZone));
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const addCivilDays = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
};

export const maxCivilDateKey = (left: string, right: string): string => (left >= right ? left : right);

export const zonedTimeToDate = (dateKey: string, timeOfDay: string, timeZone?: string | null): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeOfDay.split(':').map(Number);
  const zone = getMedicationTimeZone(timeZone);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  for (let index = 0; index < 3; index += 1) {
    const parts = getZonedDateParts(new Date(utcMs), zone);
    const zonedAsUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0);
    const targetAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const offsetMs = zonedAsUtcMs - utcMs;
    const nextUtcMs = targetAsUtcMs - offsetMs;

    if (nextUtcMs === utcMs) break;
    utcMs = nextUtcMs;
  }

  return new Date(utcMs);
};

export const formatTimeOfDayInTimeZone = (date: Date, timeZone?: string | null): string => {
  const parts = getZonedDateParts(date, getMedicationTimeZone(timeZone));
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
};