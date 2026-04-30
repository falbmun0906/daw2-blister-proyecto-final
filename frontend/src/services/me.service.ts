import { z } from 'zod';

import { objectIdSchema } from '../../../shared/schemas/common.schema';
import { apiClient, normalizeApiResponse } from './api.client';

const callerRoleSchema = z.enum(['OWNER', 'CAREGIVER', 'OBSERVER']);

export const upcomingDoseSchema = z.object({
  doseAt: z.string(),
  blisterId: objectIdSchema,
  blisterName: z.string(),
  blisterAvatarKey: z.string().nullable(),
  patientUserId: objectIdSchema,
  patientName: z.string(),
  treatmentId: objectIdSchema,
  treatmentTitle: z.string(),
  medicineId: objectIdSchema,
  medicineName: z.string(),
  amount: z.number().int().positive(),
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
}

interface CalendarQuery extends RangeQuery {
  kinds?: Array<'appointments' | 'doses'>;
}

const toRangeParams = ({ from, to, blisterId }: RangeQuery): Record<string, string> => ({
  from: from.toISOString(),
  to: to.toISOString(),
  ...(blisterId ? { blisterId } : {}),
});

export async function getUpcomingDoses(query: RangeQuery): Promise<UpcomingDose[]> {
  const response = await apiClient.get('/me/upcoming-doses', {
    params: toRangeParams(query),
  });
  return z.array(upcomingDoseSchema).parse(normalizeApiResponse(response));
}

export async function getCalendar(query: CalendarQuery): Promise<CalendarPayload> {
  const response = await apiClient.get('/me/calendar', {
    params: {
      ...toRangeParams(query),
      ...(query.kinds ? { kinds: query.kinds.join(',') } : {}),
    },
  });
  return calendarPayloadSchema.parse(normalizeApiResponse(response));
}