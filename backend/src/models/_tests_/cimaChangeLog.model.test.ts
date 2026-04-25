import { Types } from 'mongoose';

import { CimaChangeLogModel } from '../cimaChangeLog.model';

describe('CimaChangeLogModel', () => {
  it('stores mapped tipoCambio values and raw cambios payload', () => {
    const changeLog = new CimaChangeLogModel({
      medicineId: new Types.ObjectId(),
      nregist: '123456',
      tipoCambio: 'updated',
      cambios: ['estado', 'psum'],
      fechaCambio: new Date('2026-04-26T10:00:00.000Z'),
      raw: {
        tipoCambio: 3,
      },
    });

    expect(changeLog.validateSync()).toBeUndefined();
    expect(changeLog.cambios).toEqual(['estado', 'psum']);
    expect(changeLog.createdAt).toBeInstanceOf(Date);
  });
});
