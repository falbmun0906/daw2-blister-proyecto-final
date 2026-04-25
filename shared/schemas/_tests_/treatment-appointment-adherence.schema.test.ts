import {
  adherenceLogsListQuerySchema,
  createAdherenceLogSchema,
} from '../adherence.schema';
import {
  appointmentsListQuerySchema,
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
