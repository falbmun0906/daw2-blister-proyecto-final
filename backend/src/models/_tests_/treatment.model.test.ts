import { Types } from 'mongoose';

import { TreatmentModel } from '../treatment.model';

describe('TreatmentModel', () => {
  it('requires at least one medicine in each treatment', () => {
    const treatment = new TreatmentModel({
      blisterId: new Types.ObjectId(),
      title: 'Tratamiento hipertension',
      medicines: [],
      startDate: new Date('2026-04-24T08:00:00.000Z'),
    });

    const validationError = treatment.validateSync();

    expect(validationError?.errors.medicines).toBeDefined();
  });

  it('accepts valid medicine schedules', () => {
    const treatment = new TreatmentModel({
      blisterId: new Types.ObjectId(),
      title: 'Tratamiento hipertension',
      medicines: [
        {
          medicineId: new Types.ObjectId(),
          amount: 1,
          frequency: 8,
        },
      ],
      startDate: new Date('2026-04-24T08:00:00.000Z'),
      endDate: new Date('2026-04-30T08:00:00.000Z'),
    });

    expect(treatment.validateSync()).toBeUndefined();
    expect(treatment.active).toBe(true);
  });

  it('rejects end dates earlier than the start date', () => {
    const treatment = new TreatmentModel({
      blisterId: new Types.ObjectId(),
      title: 'Tratamiento hipertension',
      medicines: [
        {
          medicineId: new Types.ObjectId(),
          amount: 1,
          frequency: 8,
        },
      ],
      startDate: new Date('2026-04-24T08:00:00.000Z'),
      endDate: new Date('2026-04-20T08:00:00.000Z'),
    });

    const validationError = treatment.validateSync();

    expect(validationError?.errors.endDate).toBeDefined();
  });
});
