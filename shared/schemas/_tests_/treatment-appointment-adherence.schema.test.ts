import {
  adherenceLogsListQuerySchema,
  createAdherenceLogSchema,
} from '../adherence.schema';
import {
  appointmentCommentBodySchema,
  appointmentsListQuerySchema,
  appointmentSchema,
  createAppointmentSchema,
} from '../appointment.schema';
import {
  createTreatmentSchema,
  treatmentsListQuerySchema,
  updateTreatmentSchema,
} from '../treatment.schema';

describe('treatment, appointment and adherence shared schemas', () => {
  it('rejects treatment end dates earlier than start dates', () => {
    const result = createTreatmentSchema.safeParse({
      title: 'Tratamiento hipertension',
      medicines: [
        {
          medicineId: '507f1f77bcf86cd799439011',
          amount: 1,
          frequency: 8,
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

  it('requires future dates for appointments', () => {
    const result = createAppointmentSchema.safeParse({
      title: 'Revision',
      date: '2020-04-25T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
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
});
