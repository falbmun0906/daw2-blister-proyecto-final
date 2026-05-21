import {
  adherenceLogsListQuerySchema,
  createAdherenceLogSchema,
} from '../adherence.schema';
import {
  adherenceLoggerInputSchema,
  appointmentCreateInputSchema,
  appointmentManagerInputSchema,
  scheduleAssistantInputSchema,
} from '../mcp.schema';
import {
  appointmentCommentBodySchema,
  appointmentsListQuerySchema,
  appointmentSchema,
  createAppointmentSchema,
} from '../appointment.schema';
import {
  createTreatmentSchema,
  treatmentSchema,
  treatmentsListQuerySchema,
  updateTreatmentSchema,
} from '../treatment.schema';
import { DEFAULT_MEDICATION_TIME_ZONE } from '../schema.constants';

describe('treatment, appointment and adherence shared schemas', () => {
  it('rejects treatment end dates earlier than start dates', () => {
    const result = createTreatmentSchema.safeParse({
      title: 'Tratamiento hipertension',
      patientUserId: '507f1f77bcf86cd799439015',
      medicines: [
        {
          medicineId: '507f1f77bcf86cd799439011',
          amount: 0.5,
          firstDoseAt: '2030-04-25T08:00:00.000Z',
          scheduleType: 'interval',
          frequencyHours: 8,
          dailyDoseTimes: [],
          isRecurring: true,
        },
      ],
      startDate: '2030-04-25T10:00:00.000Z',
      endDate: '2030-04-24T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('requires at least one treatment field on patch payloads', () => {
    const result = updateTreatmentSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it('accepts historical appointment dates for manual records', () => {
    const result = createAppointmentSchema.safeParse({
      patientUserId: '507f1f77bcf86cd799439011',
      title: 'Revision',
      date: '2020-04-25T10:00:00.000Z',
    });
    const mcpResult = appointmentCreateInputSchema.safeParse({
      blisterId: '507f1f77bcf86cd799439012',
      patientUserId: '507f1f77bcf86cd799439011',
      title: 'Revision historica',
      date: '2020-04-25T10:00:00.000Z',
    });

    expect(result.success).toBe(true);
    expect(mcpResult.success).toBe(true);
  });

  it('accepts appointment descriptions and response comments', () => {
    const createResult = createAppointmentSchema.safeParse({
      patientUserId: '507f1f77bcf86cd799439011',
      title: 'Revision',
      date: '2030-04-25T10:00:00.000Z',
      description: 'Llevar informe de tension',
      location: null,
    });

    const responseResult = appointmentSchema.safeParse({
      id: '507f1f77bcf86cd799439012',
      blisterId: '507f1f77bcf86cd799439013',
      patientUserId: '507f1f77bcf86cd799439011',
      title: 'Revision',
      location: null,
      description: 'Llevar informe de tension',
      date: '2030-04-25T10:00:00.000Z',
      treatmentId: null,
      comments: [
        {
          id: '507f1f77bcf86cd799439014',
          userId: '507f1f77bcf86cd799439011',
          authorName: 'Ana Lopez',
          authorAvatarKey: null,
          text: 'Preparar analitica',
          createdAt: '2030-04-24T10:00:00.000Z',
          updatedAt: '2030-04-24T10:00:00.000Z',
        },
      ],
    });

    expect(createResult.success).toBe(true);
    expect(responseResult.success).toBe(true);
  });

  it('rejects blank appointment comments', () => {
    const result = appointmentCommentBodySchema.safeParse({ text: '   ' });

    expect(result.success).toBe(false);
  });

  it('applies pagination defaults for treatments and appointments collections', () => {
    expect(treatmentsListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
    expect(appointmentsListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
    expect(adherenceLogsListQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
    });
  });

  it('requires notes when an adherence log is forced', () => {
    const result = createAdherenceLogSchema.safeParse({
      medicineId: '507f1f77bcf86cd799439011',
      treatmentId: '507f1f77bcf86cd799439012',
      force: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects adherence amounts lower than 1 when provided', () => {
    const result = createAdherenceLogSchema.safeParse({
      medicineId: '507f1f77bcf86cd799439011',
      treatmentId: '507f1f77bcf86cd799439012',
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('accepts exact daily treatment schedules and half-dose adherence amounts', () => {
    const treatmentResult = createTreatmentSchema.safeParse({
      patientUserId: '507f1f77bcf86cd799439015',
      title: 'Tratamiento exacto',
      medicines: [
        {
          medicineId: '507f1f77bcf86cd799439011',
          amount: 0.5,
          firstDoseAt: '2030-04-25T08:00:00.000Z',
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: ['08:00', '20:00'],
          isRecurring: true,
        },
      ],
      startDate: '2030-04-25T00:00:00.000Z',
    });
    const adherenceResult = createAdherenceLogSchema.safeParse({
      medicineId: '507f1f77bcf86cd799439011',
      treatmentId: '507f1f77bcf86cd799439012',
      amount: 0.5,
    });

    expect(treatmentResult.success).toBe(true);
    expect(adherenceResult.success).toBe(true);
  });

  it('defaults and validates treatment schedule timezones', () => {
    const treatmentResult = createTreatmentSchema.safeParse({
      patientUserId: '507f1f77bcf86cd799439015',
      title: 'Tratamiento exacto',
      medicines: [
        {
          medicineId: '507f1f77bcf86cd799439011',
          amount: 1,
          firstDoseAt: '2030-04-25T08:00:00.000Z',
          scheduleType: 'daily_times',
          frequencyHours: null,
          dailyDoseTimes: ['10:00'],
          isRecurring: true,
        },
      ],
      startDate: '2030-04-25T00:00:00.000Z',
    });
    const invalidResponse = treatmentSchema.safeParse({
      id: '507f1f77bcf86cd799439012',
      blisterId: '507f1f77bcf86cd799439013',
      patientUserId: '507f1f77bcf86cd799439015',
      title: 'Tratamiento exacto',
      description: null,
      timeZone: 'Invalid/Timezone',
      medicines: [],
      startDate: '2030-04-25T00:00:00.000Z',
      endDate: null,
      active: true,
    });

    expect(treatmentResult.success).toBe(true);
    if (treatmentResult.success) {
      expect(treatmentResult.data.timeZone).toBe(DEFAULT_MEDICATION_TIME_ZONE);
    }
    expect(invalidResponse.success).toBe(false);
  });

  it('allows clearing treatment end dates in patch payloads', () => {
    const result = updateTreatmentSchema.safeParse({
      startDate: '2030-04-25T00:00:00.000Z',
      endDate: null,
    });

    expect(result.success).toBe(true);
  });

  it('parses MCP tool date inputs from ISO strings without exposing Date in the input schema', () => {
    const adherenceResult = adherenceLoggerInputSchema.safeParse({
      blisterId: '507f1f77bcf86cd799439011',
      medicineId: '507f1f77bcf86cd799439012',
      treatmentId: '507f1f77bcf86cd799439013',
      timestamp: '2030-04-25T10:00:00.000Z',
    });
    const scheduleResult = scheduleAssistantInputSchema.safeParse({
      from: '2030-04-25T10:00:00.000Z',
      to: '2030-04-25T18:00:00.000Z',
    });
    const appointmentResult = appointmentManagerInputSchema.safeParse({
      from: '2030-04-25T10:00:00.000Z',
      to: '2030-04-25T18:00:00.000Z',
      page: 1,
      limit: 20,
    });

    expect(adherenceResult.success).toBe(true);
    expect(scheduleResult.success).toBe(true);
    expect(appointmentResult.success).toBe(true);

    if (adherenceResult.success) {
      expect(adherenceResult.data.timestamp).toBeInstanceOf(Date);
    }

    if (scheduleResult.success) {
      expect(scheduleResult.data.from).toBeInstanceOf(Date);
      expect(scheduleResult.data.to).toBeInstanceOf(Date);
    }

    if (appointmentResult.success) {
      expect(appointmentResult.data.from).toBeInstanceOf(Date);
      expect(appointmentResult.data.to).toBeInstanceOf(Date);
    }
  });
});
