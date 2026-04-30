import { Types } from 'mongoose';

import { AppointmentModel } from '../appointment.model';
import { findSchemaIndex } from './schema-test.utils';

describe('AppointmentModel', () => {
  it('supports appointments linked to a blister and optionally to a treatment', () => {
    const appointment = new AppointmentModel({
      blisterId: new Types.ObjectId(),
      patientUserId: new Types.ObjectId(),
      title: 'Revision cardiologia',
      date: new Date('2026-05-01T10:00:00.000Z'),
    });

    expect(appointment.validateSync()).toBeUndefined();
    expect(appointment.treatmentId).toBeNull();
  });

  it('declares the blister and date calendar index', () => {
    const index = findSchemaIndex(AppointmentModel.schema.indexes(), { blisterId: 1, date: 1 });

    expect(index).toBeDefined();
  });
});
