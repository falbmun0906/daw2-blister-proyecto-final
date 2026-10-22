import { z } from 'zod';

import {
  objectIdSchema,
  positiveQuantityValueSchema,
} from '../../../shared/schemas/common.schema';
import { apiClient, normalizeApiResponse } from './api.client';

const callerRoleSchema = z.enum(['OWNER', 'CAREGIVER', 'OBSERVER']);

export const upcomingDoseSchema = z.object({
  doseAt: z.string(),
  displayTime: z.string().nullable().default(null),
  blisterId: objectIdSchema,
  blisterName: z.string(),
  blisterAvatarKey: z.string().nullable(),
  patientUserId: objectIdSchema,
  patientName: z.string(),
  patientAvatarKey: z.string().nullable(),
  treatmentId: objectIdSchema,
  treatmentTitle: z.string(),
  medicineId: objectIdSchema,
  medicineName: z.string(),
  amount: positiveQuantityValueSchema,
  stockUnit: z.string().default('unidades'),
  timeZone: z.string().default('Europe/Madrid'),
  scheduledTime: z.string().nullable().default(null),
  isTimeAdjusted: z.boolean().default(false),
  isTaken: z.boolean().default(false),
  isSkipped: z.boolean().default(false),
  takenAt: z.string().nullable().default(null),
  skippedAt: z.string().nullable().default(null),
  adherenceCreatedAt: z.string().nullable().default(null),
  adherenceLogId: objectIdSchema.nullable().default(null),
  callerRole: callerRoleSchema,
});

export const calendarAppointmentSchema = z.object({
  id: objectIdSchema,
  blisterId: objectIdSchema,
  blisterName: z.string(),
  blisterAvatarKey: z.string().nullable(),
  patientUserId: objectIdSchema,
  patientName: z.string(),
  treatmentId: objectIdSchema.nullable(),
  title: z.string(),
  date: z.string(),
  callerRole: callerRoleSchema,
});

const calendarPayloadSchema = z.object({
  appointments: z.array(calendarAppointmentSchema),
  doses: z.array(upcomingDoseSchema),
});

export type UpcomingDose = z.infer<typeof upcomingDoseSchema>;
export type CalendarAppointment = z.infer<typeof calendarAppointmentSchema>;
export type CalendarPayload = z.infer<typeof calendarPayloadSchema>;

interface RangeQuery {
  from: Date;
  to: Date;
  blisterId?: string | null;
  includeTaken?: boolean;
}

interface CalendarQuery extends RangeQuery {
  kinds?: Array<'appointments' | 'doses'>;
}

const toRangeParams = ({ from, to, blisterId, includeTaken }: RangeQuery): Record<string, string> => ({
  from: from.toISOString(),
  to: to.toISOString(),
  ...(blisterId ? { blisterId } : {}),
  ...(includeTaken ? { includeTaken: 'true' } : {}),
});

export async function getUpcomingDoses(query: RangeQuery): Promise<UpcomingDose[]> {
  const response = await apiClient.get('/me/upcoming-doses', {
    params: toRangeParams(query),
  });
  return z.array(upcomingDoseSchema).parse(normalizeApiResponse(response));
}

export async function getCalendar(query: CalendarQuery): Promise<CalendarPayload> {
  const maxWindow = 42 * 24 * 60 * 60 * 1000;
  if (query.to.getTime() - query.from.getTime() > maxWindow) {
    const appointments = new Map<string, CalendarAppointment>();
    const doses = new Map<string, UpcomingDose>();
    for (let start = query.from.getTime(); start < query.to.getTime(); start += maxWindow) {
      const part = await getCalendar({ ...query, from: new Date(start), to: new Date(Math.min(start + maxWindow, query.to.getTime())) });
      part.appointments.forEach((item) => appointments.set(item.id, item));
      part.doses.forEach((item) => doses.set(`${item.treatmentId}:${item.medicineId}:${item.doseAt}`, item));
    }
    return { appointments: [...appointments.values()], doses: [...doses.values()] };
  }
  const response = await apiClient.get('/me/calendar', {
    params: {
      ...toRangeParams(query),
      ...(query.kinds ? { kinds: query.kinds.join(',') } : {}),
    },
  });
  return calendarPayloadSchema.parse(normalizeApiResponse(response));
}
