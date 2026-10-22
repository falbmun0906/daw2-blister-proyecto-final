import { getCivilDateKey, formatTimeOfDayInTimeZone, zonedTimeToDate } from '../../../shared/utils/time-zone';
import { createTreatmentSchema, updateTreatmentSchema, type Treatment, type CreateTreatmentInput, type UpdateTreatmentInput } from '../../../shared/schemas/treatment.schema';
import { DEFAULT_MEDICATION_TIME_ZONE } from '../../../shared/schemas/schema.constants';

export interface FormValues {
  patientUserId: string;
  title: string;
  description: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  active: boolean;
  medicines: Array<{
    medicineId: string;
    amount: number;
    firstDoseTime: string;
    frequencyHours: number;
    scheduleType: 'interval' | 'daily_times';
    dailyDoseTimes: Array<{ time: string }>;
    isRecurring: boolean;
    note: string;
  }>;
}

function toLocalParts(value: Date, timeZone = getBrowserTimeZone()): { date: string; time: string } {
  return {
    date: getCivilDateKey(value, timeZone),
    time: formatTimeOfDayInTimeZone(value, timeZone),
  };
}

function defaultStartParts(): { date: string; time: string } {
  const now = new Date();
  return toLocalParts(now);
}

function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_MEDICATION_TIME_ZONE;
}

function toLocalDateTime(date: string, time: string, timeZone = getBrowserTimeZone()): Date {
  return zonedTimeToDate(date, time, timeZone);
}

export const createTreatmentMedicine = (firstDoseTime = '08:00'): FormValues['medicines'][number] => ({
  medicineId: '',
  amount: 1,
  firstDoseTime,
  frequencyHours: 8,
  scheduleType: 'interval',
  dailyDoseTimes: [{ time: firstDoseTime }],
  isRecurring: true,
  note: '',
});

function normalizeDailyDoseTimes(entry: FormValues['medicines'][number]): string[] {
  return entry.dailyDoseTimes
    .flatMap((item) => {
      const time = item.time.trim();
      return time ? [time] : [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function buildTreatmentMedicinePayload(
  entry: FormValues['medicines'][number],
  startDate: string,
  timeZone: string,
) {
  const exactDailyTimes = normalizeDailyDoseTimes(entry);
  const firstDoseTime = entry.isRecurring && entry.scheduleType === 'daily_times'
    ? (exactDailyTimes[0] || entry.firstDoseTime || '08:00')
    : entry.firstDoseTime || exactDailyTimes[0] || '08:00';

  return {
    medicineId: entry.medicineId,
    amount: entry.amount,
    firstDoseAt: toLocalDateTime(startDate, firstDoseTime, timeZone),
    scheduleType: entry.isRecurring ? entry.scheduleType : 'interval',
    frequencyHours: entry.isRecurring && entry.scheduleType === 'interval' ? entry.frequencyHours : null,
    dailyDoseTimes: entry.isRecurring && entry.scheduleType === 'daily_times' ? exactDailyTimes : [],
    isRecurring: entry.isRecurring,
    note: entry.note || undefined,
  };
}

export function buildCreatePayload(values: FormValues): CreateTreatmentInput {
  return createTreatmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    description: values.description || undefined,
    timeZone: values.timeZone || getBrowserTimeZone(),
    startDate: toLocalDateTime(values.startDate, '00:00', values.timeZone),
    endDate: values.endDate ? toLocalDateTime(values.endDate, '23:59', values.timeZone) : undefined,
    active: values.active,
    medicines: values.medicines.map((entry) => buildTreatmentMedicinePayload(entry, values.startDate, values.timeZone)),
  });
}

export function buildUpdatePayload(values: FormValues, original: Treatment | null): UpdateTreatmentInput {
  const payload = updateTreatmentSchema.parse({
    patientUserId: values.patientUserId,
    title: values.title,
    description: values.description || undefined,
    timeZone: values.timeZone || getBrowserTimeZone(),
    startDate: toLocalDateTime(values.startDate, '00:00', values.timeZone),
    endDate: values.endDate ? toLocalDateTime(values.endDate, '23:59', values.timeZone) : null,
    active: values.active,
    medicines: values.medicines.map((entry) => buildTreatmentMedicinePayload(entry, values.startDate, values.timeZone)),
  });
  if (original && original.timeZone === values.timeZone) {
    if (getCivilDateKey(new Date(original.startDate), values.timeZone) === values.startDate) {
      payload.startDate = new Date(original.startDate);
      payload.medicines?.forEach((entry) => {
        const previous = original.medicines.find((item) => item.medicineId === entry.medicineId);
        if (previous) {
          const originalInstant = new Date(previous.firstDoseAt);
          const nextTime = formatTimeOfDayInTimeZone(entry.firstDoseAt, values.timeZone);
          entry.firstDoseAt = formatTimeOfDayInTimeZone(originalInstant, values.timeZone) === nextTime
            ? originalInstant
            : zonedTimeToDate(getCivilDateKey(originalInstant, values.timeZone), nextTime, values.timeZone);
        }
      });
    }
    if (original.endDate && getCivilDateKey(new Date(original.endDate), values.timeZone) === values.endDate) {
      payload.endDate = new Date(original.endDate);
    }
  }
  return payload;
}

export function toFormValues(
  treatment: Treatment | null,
  fallbackPatientUserId = '',
): FormValues {
  if (!treatment) {
    const start = defaultStartParts();
    return {
      patientUserId: fallbackPatientUserId,
      title: '',
      description: '',
      timeZone: getBrowserTimeZone(),
      startDate: start.date,
      endDate: '',
      active: true,
      medicines: [createTreatmentMedicine(start.time)],
    };
  }
  const start = toLocalParts(new Date(treatment.startDate), treatment.timeZone);
  return {
    patientUserId: treatment.patientUserId,
    title: treatment.title,
    description: treatment.description ?? '',
    timeZone: treatment.timeZone || getBrowserTimeZone(),
    startDate: start.date,
    endDate: treatment.endDate ? toLocalParts(new Date(treatment.endDate), treatment.timeZone).date : '',
    active: treatment.active,
    medicines: treatment.medicines.map((entry: Treatment['medicines'][number]) => ({
      medicineId: entry.medicineId,
      amount: entry.amount,
      firstDoseTime: toLocalParts(new Date(entry.firstDoseAt), treatment.timeZone).time,
      frequencyHours: entry.frequencyHours ?? 8,
      scheduleType: entry.scheduleType,
      dailyDoseTimes: (entry.dailyDoseTimes.length > 0
        ? entry.dailyDoseTimes
        : [toLocalParts(new Date(entry.firstDoseAt), treatment.timeZone).time]).map((time) => ({ time })),
      isRecurring: entry.isRecurring,
      note: entry.note ?? '',
    })),
  };
}
