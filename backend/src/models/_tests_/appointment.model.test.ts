import { Types } from 'mongoose';

import { AppointmentModel } from '../appointment.model';
import { findSchemaIndex } from './schema-test.utils';

describe('AppointmentModel', () => {
  it('supports appointments linked to a blister and optionally to a treatment', () => {
    const appointment = new AppointmentModel({
      blisterId: new Types.ObjectId(),
      patientUserId: new Types.ObjectId(),
      title: 'Revision cardiologia',
      description: 'Llevar informe de tension',
      date: new Date('2026-05-01T10:00:00.000Z'),
      comments: [
        {
          userId: new Types.ObjectId(),
          text: 'Pedir justificante',
        },
      ],
    });

    expect(appointment.validateSync()).toBeUndefined();
    expect(appointment.treatmentId).toBeNull();
    expect(appointment.comments).toHaveLength(1);
  });

  it('declares the blister and date calendar index', () => {
    const index = findSchemaIndex(AppointmentModel.schema.indexes(), { blisterId: 1, date: 1 });

    expect(index).toBeDefined();
  });
});
